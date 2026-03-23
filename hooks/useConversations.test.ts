import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConversations } from './useConversations';
import { ChatMessage } from '../types';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

describe('useConversations', () => {
  it('creates a default conversation on first launch', async () => {
    const { result } = renderHook(() => useConversations());

    // Wait for async load
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(result.current.loaded).toBe(true);
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeConversation).not.toBeNull();
    expect(result.current.activeConversation?.title).toBe('New Chat');
  });

  it('restores conversations from storage', async () => {
    const saved = [
      { id: 'c1', title: 'Test Chat', createdAt: 1000, updatedAt: 2000 },
      { id: 'c2', title: 'Another', createdAt: 1500, updatedAt: 1500 },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@openclaw/conversations') return Promise.resolve(JSON.stringify(saved));
      if (key === '@openclaw/activeConversation') return Promise.resolve('c2');
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.activeConversation?.id).toBe('c2');
  });

  it('creates a new conversation', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    act(() => {
      result.current.newConversation();
    });

    expect(result.current.conversations).toHaveLength(2);
    // The new conversation should be the active one
    expect(result.current.activeConversation?.title).toBe('New Chat');
    expect(result.current.conversations[0].title).toBe('New Chat');
  });

  it('deletes a conversation and switches to another', async () => {
    const saved = [
      { id: 'c1', title: 'First', createdAt: 1000, updatedAt: 2000 },
      { id: 'c2', title: 'Second', createdAt: 1500, updatedAt: 1500 },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@openclaw/conversations') return Promise.resolve(JSON.stringify(saved));
      if (key === '@openclaw/activeConversation') return Promise.resolve('c1');
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    act(() => {
      result.current.deleteConversation('c1');
    });

    // Should switch to c2
    expect(result.current.activeConversation?.id).toBe('c2');
    expect(result.current.conversations).toHaveLength(1);
  });

  it('auto-titles from first message', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    act(() => {
      result.current.autoTitle('Hello, how are you?');
    });

    expect(result.current.activeConversation?.title).toBe('Hello, how are you?');
  });

  it('truncates long auto-title to 40 chars', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    const longMsg = 'A'.repeat(60);
    act(() => {
      result.current.autoTitle(longMsg);
    });

    expect(result.current.activeConversation?.title).toBe('A'.repeat(40) + '...');
  });

  it('renames a conversation', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    const id = result.current.activeConversation?.id ?? '';
    act(() => {
      result.current.renameConversation(id, 'Renamed');
    });

    expect(result.current.activeConversation?.title).toBe('Renamed');
  });

  it('switchConversation changes active and loads messages from storage', async () => {
    const saved = [
      { id: 'c1', title: 'First', createdAt: 1000, updatedAt: 2000 },
      { id: 'c2', title: 'Second', createdAt: 1500, updatedAt: 1500 },
    ];
    const c2Messages = [
      { id: 'm1', role: 'user', content: 'hi', timestamp: 3000 },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@openclaw/conversations') return Promise.resolve(JSON.stringify(saved));
      if (key === '@openclaw/activeConversation') return Promise.resolve('c1');
      if (key === '@openclaw/conv_messages/c2') return Promise.resolve(JSON.stringify(c2Messages));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });
    expect(result.current.activeConversation?.id).toBe('c1');

    let messages: unknown[] = [];
    await act(async () => {
      messages = await result.current.switchConversation('c2');
    });

    expect(result.current.activeConversation?.id).toBe('c2');
    expect(messages).toEqual(c2Messages);
  });

  it('saveActiveMessages calls storage with active conversation messages', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    const activeId = result.current.activeConversation?.id;
    expect(activeId).toBeTruthy();

    const msgs: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hello', timestamp: 1000 },
    ];

    act(() => {
      result.current.saveActiveMessages(msgs);
    });

    // Allow the void promise to flush
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `@openclaw/conv_messages/${activeId ?? ''}`,
      expect.any(String),
    );
  });

  it('touchActiveConversation updates the updatedAt timestamp', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    const before = result.current.activeConversation?.updatedAt ?? 0;

    // Advance time slightly so Date.now() differs
    jest.spyOn(Date, 'now').mockReturnValue(before + 5000);

    act(() => {
      result.current.touchActiveConversation();
    });

    expect(result.current.activeConversation?.updatedAt).toBe(before + 5000);

    (Date.now as jest.Mock).mockRestore();
  });

  it('deleteConversation when it is the last one creates a fresh conversation', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    // Should start with exactly one conversation
    expect(result.current.conversations).toHaveLength(1);
    const onlyId = result.current.activeConversation?.id ?? '';

    act(() => {
      result.current.deleteConversation(onlyId);
    });

    // Should still have one conversation, but a new one
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeConversation).not.toBeNull();
    expect(result.current.activeConversation?.id).not.toBe(onlyId);
    expect(result.current.activeConversation?.title).toBe('New Chat');
  });

  it('restoring active conversation falls back to first when savedActiveId does not match', async () => {
    const saved = [
      { id: 'c1', title: 'First', createdAt: 1000, updatedAt: 2000 },
      { id: 'c2', title: 'Second', createdAt: 1500, updatedAt: 1500 },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@openclaw/conversations') return Promise.resolve(JSON.stringify(saved));
      // Return an ID that doesn't exist in the list
      if (key === '@openclaw/activeConversation') return Promise.resolve('nonexistent');
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    // Should fall back to first conversation
    expect(result.current.activeConversation?.id).toBe('c1');
  });

  it('autoTitle does not override a non-default title', async () => {
    const saved = [
      { id: 'c1', title: 'My Custom Title', createdAt: 1000, updatedAt: 2000 },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@openclaw/conversations') return Promise.resolve(JSON.stringify(saved));
      if (key === '@openclaw/activeConversation') return Promise.resolve('c1');
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useConversations());
    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    expect(result.current.activeConversation?.title).toBe('My Custom Title');

    act(() => {
      result.current.autoTitle('Some new message');
    });

    // Title should remain unchanged
    expect(result.current.activeConversation?.title).toBe('My Custom Title');
  });

  it('saveActiveMessages does nothing without an active ID', async () => {
    // Don't wait for initialization — activeId is null before load completes
    const { result } = renderHook(() => useConversations());

    // Before async init, activeId is null
    expect(result.current.activeConversation).toBeNull();

    // Clear any calls from the render itself
    (AsyncStorage.setItem as jest.Mock).mockClear();

    const msgs: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hello', timestamp: 1000 },
    ];

    act(() => {
      result.current.saveActiveMessages(msgs);
    });

    await act(async () => {
      await new Promise((r) => { setTimeout(r, 10); });
    });

    // saveConversationMessages should not have been called (no conv_messages key)
    const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls as string[][];
    const messageCalls = setItemCalls.filter((call) => call[0].includes('conv_messages'));
    expect(messageCalls).toHaveLength(0);
  });
});

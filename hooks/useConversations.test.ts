import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConversations } from './useConversations';

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
});

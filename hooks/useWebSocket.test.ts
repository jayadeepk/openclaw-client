import { renderHook, act } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { useWebSocket } from './useWebSocket';
import { AppSettings } from '../types';

// ─── Mock WebSocket ──────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.OPEN;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  serverSend(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

(global as any).WebSocket = MockWebSocket;

const defaultSettings: AppSettings = {
  gatewayHost: 'localhost',
  gatewayPort: '18789',
  authToken: 'test-token',
};

function getLastWs(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

function sendChallenge(ws: MockWebSocket) {
  ws.serverSend({
    type: 'event',
    event: 'connect.challenge',
    payload: { nonce: 'abc123', ts: Date.now() },
  });
}

function sendHelloOk(ws: MockWebSocket, reqId: string) {
  ws.serverSend({
    type: 'res',
    id: reqId,
    ok: true,
    payload: { type: 'hello-ok', protocol: 3, server: { version: '1.0', connId: 'c1' } },
  });
}

function getLastSentFrame(ws: MockWebSocket) {
  return JSON.parse(ws.sent[ws.sent.length - 1]);
}

function getSentFrames(ws: MockWebSocket) {
  return ws.sent.map((s) => JSON.parse(s));
}

beforeEach(() => {
  jest.clearAllMocks();
  MockWebSocket.instances = [];
});

// Helper: connect and complete handshake
async function connectFull() {
  const hook = renderHook(() => useWebSocket(defaultSettings));
  act(() => {
    hook.result.current.connect();
  });
  const ws = getLastWs();
  act(() => {
    sendChallenge(ws);
  });
  const connectReq = getLastSentFrame(ws);
  // sendHelloOk resolves the pending promise, the .then() runs in a microtask
  act(() => {
    sendHelloOk(ws, connectReq.id);
  });
  // Wait for microtask (.then callback) to resolve
  await act(async () => {
    await Promise.resolve();
  });
  return { hook, ws };
}

// ─── Connection Lifecycle ────────────────────────────────────────────────────

describe('useWebSocket - connection lifecycle', () => {
  it('sets status to connecting on connect()', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    expect(result.current.status).toBe('connecting');
  });

  it('creates WebSocket with correct URL', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    expect(getLastWs().url).toBe('ws://localhost:18789');
  });

  it('completes handshake: challenge → connect → hello-ok → connected', async () => {
    const { hook } = await connectFull();
    expect(hook.result.current.status).toBe('connected');
  });

  it('sends connect request with auth token after challenge', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      sendChallenge(ws);
    });
    const connectReq = getLastSentFrame(ws);
    expect(connectReq.method).toBe('connect');
    expect(connectReq.params.auth.token).toBe('test-token');
    expect(connectReq.params.role).toBe('operator');
  });

  it('sets status to authenticating after challenge', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      sendChallenge(ws);
    });
    expect(result.current.status).toBe('authenticating');
  });

  it('sets status to error on auth failure', async () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      sendChallenge(ws);
    });
    const connectReq = getLastSentFrame(ws);
    act(() => {
      ws.serverSend({
        type: 'res',
        id: connectReq.id,
        ok: false,
        error: { code: 'AUTH_FAILED', message: 'Invalid token' },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.messages.some((m) => m.content.includes('Invalid token'))).toBe(true);
  });
});

// ─── Sending Messages ────────────────────────────────────────────────────────

describe('useWebSocket - sending messages', () => {
  it('is no-op when not connected', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.sendMessage('hello');
    });
    expect(result.current.messages).toHaveLength(0);
  });

  it('adds user message optimistically', async () => {
    const { hook } = await connectFull();
    act(() => {
      hook.result.current.sendMessage('hello');
    });
    const userMsg = hook.result.current.messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toBe('hello');
  });

  it('sends chat.send frame with correct params', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      hook.result.current.sendMessage('hello');
    });
    const chatFrame = getSentFrames(ws).find((f: any) => f.method === 'chat.send');
    expect(chatFrame).toBeDefined();
    expect(chatFrame.params.message).toBe('hello');
    expect(chatFrame.params.sessionKey).toBe('main');
    expect(chatFrame.params.attachments).toEqual([]);
  });

  it('adds system error on send failure', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      hook.result.current.sendMessage('hello');
    });
    const sendFrame = getSentFrames(ws).find((f: any) => f.method === 'chat.send');
    act(() => {
      ws.serverSend({
        type: 'res',
        id: sendFrame.id,
        ok: false,
        error: { code: 'ERR', message: 'Send failed' },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.messages.some((m) => m.content.includes('Send failed'))).toBe(true);
  });
});

// ─── Chat Streaming ──────────────────────────────────────────────────────────

describe('useWebSocket - chat streaming', () => {
  it('delta event creates streaming assistant message', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'Hello' } },
      });
    });
    const msg = hook.result.current.messages.find((m) => m.role === 'assistant');
    expect(msg?.content).toBe('Hello');
    expect(msg?.streaming).toBe(true);
  });

  it('subsequent delta updates content', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'He' } },
      });
    });
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 2, state: 'delta', message: { role: 'assistant', content: 'Hello world' } },
      });
    });
    const assistantMsgs = hook.result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe('Hello world');
  });

  it('final event marks streaming false', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'Hi' } },
      });
    });
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 2, state: 'final', message: { role: 'assistant', content: 'Hi there' } },
      });
    });
    const msg = hook.result.current.messages.find((m) => m.role === 'assistant');
    expect(msg?.streaming).toBe(false);
    expect(msg?.content).toBe('Hi there');
  });

  it('final without prior delta creates complete message', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run2', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'One shot' } },
      });
    });
    const msg = hook.result.current.messages.find((m) => m.role === 'assistant');
    expect(msg?.content).toBe('One shot');
    expect(msg?.streaming).toBeUndefined();
  });

  it('error state preserves existing content', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'partial text' } },
      });
    });
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 2, state: 'error', message: { role: 'assistant', content: 'err' } },
      });
    });
    const msg = hook.result.current.messages.find((m) => m.role === 'assistant');
    expect(msg?.streaming).toBe(false);
    expect(msg?.content).toBe('partial text');
  });

  it('aborted state preserves existing content', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'partial' } },
      });
    });
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 2, state: 'aborted', message: { role: 'assistant', content: 'x' } },
      });
    });
    const msg = hook.result.current.messages.find((m) => m.role === 'assistant');
    expect(msg?.streaming).toBe(false);
    expect(msg?.content).toBe('partial');
  });
});

// ─── TTS ─────────────────────────────────────────────────────────────────────

describe('useWebSocket - TTS', () => {
  it('triggers TTS request on final message', async () => {
    const { ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'Hello' } },
      });
    });
    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    expect(ttsReq).toBeDefined();
    expect(ttsReq.params.text).toBe('Hello');
  });

  it('falls back to device Speech when gateway TTS fails', async () => {
    const { ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'Hello' } },
      });
    });
    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    act(() => {
      ws.serverSend({ type: 'res', id: ttsReq.id, ok: false, error: { code: 'ERR', message: 'TTS unavailable' } });
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(Speech.speak).toHaveBeenCalledWith('Hello');
  });

  it('strips emojis from mixed text for TTS', async () => {
    const { ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'Hello 🎉 world' } },
      });
    });
    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    expect(ttsReq.params.text).toBe('Hello world');
  });

  it('keeps emoji-only messages for TTS', async () => {
    const { ws } = await connectFull();
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: '🎉🎊' } },
      });
    });
    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    expect(ttsReq.params.text).toBe('🎉🎊');
  });
});

// ─── TTS success path ────────────────────────────────────────────────────────

describe('useWebSocket - TTS success path', () => {
  it('calls onAudioReceived when gateway TTS succeeds', async () => {
    const onAudio = jest.fn();
    const hook = renderHook(() => useWebSocket(defaultSettings, onAudio));
    act(() => {
      hook.result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      sendChallenge(ws);
    });
    const connectReq = getLastSentFrame(ws);
    act(() => {
      sendHelloOk(ws, connectReq.id);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Trigger final message → speakText → tts.convert
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'Hello' } },
      });
    });

    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    act(() => {
      ws.serverSend({
        type: 'res',
        id: ttsReq.id,
        ok: true,
        payload: { audioBase64: 'base64audio', outputFormat: 'audio/mp3' },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onAudio).toHaveBeenCalledWith('base64audio', 'audio/mp3');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('uses default format audio/mp3 when outputFormat missing', async () => {
    const onAudio = jest.fn();
    const hook = renderHook(() => useWebSocket(defaultSettings, onAudio));
    act(() => {
      hook.result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      sendChallenge(ws);
    });
    const connectReq = getLastSentFrame(ws);
    act(() => {
      sendHelloOk(ws, connectReq.id);
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'final', message: { role: 'assistant', content: 'Hi' } },
      });
    });

    const ttsReq = getSentFrames(ws).find((f: any) => f.method === 'tts.convert');
    act(() => {
      ws.serverSend({
        type: 'res',
        id: ttsReq.id,
        ok: true,
        payload: { audioBase64: 'data' },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onAudio).toHaveBeenCalledWith('data', 'audio/mp3');
  });
});

// ─── Edge cases / branch coverage ───────────────────────────────────────────

describe('useWebSocket - edge cases', () => {
  it('error event with no streaming entry is ignored', async () => {
    const { hook, ws } = await connectFull();
    const msgsBefore = hook.result.current.messages.length;
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'unknown-run', sessionKey: 'main', seq: 1, state: 'error', message: { role: 'assistant', content: 'err' } },
      });
    });
    expect(hook.result.current.messages.length).toBe(msgsBefore);
  });

  it('chat event with empty content is ignored', async () => {
    const { hook, ws } = await connectFull();
    const msgsBefore = hook.result.current.messages.length;
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: '' } },
      });
    });
    expect(hook.result.current.messages.length).toBe(msgsBefore);
  });

  it('chat event with no message is ignored', async () => {
    const { hook, ws } = await connectFull();
    const msgsBefore = hook.result.current.messages.length;
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta' },
      });
    });
    expect(hook.result.current.messages.length).toBe(msgsBefore);
  });

  it('ignores unknown event types', async () => {
    const { hook, ws } = await connectFull();
    act(() => {
      ws.serverSend({ type: 'event', event: 'some.unknown.event', payload: {} });
    });
    expect(hook.result.current.status).toBe('connected');
  });
});

// ─── Disconnect / Reconnect ─────────────────────────────────────────────────

describe('useWebSocket - disconnect and reconnect', () => {
  it('disconnect() sets status to disconnected', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    act(() => {
      result.current.disconnect();
    });
    expect(result.current.status).toBe('disconnected');
  });

  it('auto-reconnects after 3s when authToken exists', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });

    const initialCount = MockWebSocket.instances.length;
    const ws = getLastWs();
    // Simulate server-initiated close
    act(() => {
      ws.onclose?.();
    });

    expect(MockWebSocket.instances.length).toBe(initialCount);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(MockWebSocket.instances.length).toBeGreaterThan(initialCount);
    jest.useRealTimers();
  });

  it('does not reconnect when authToken is empty', () => {
    jest.useFakeTimers();
    const noTokenSettings = { ...defaultSettings, authToken: '' };
    const { result } = renderHook(() => useWebSocket(noTokenSettings));
    act(() => {
      result.current.connect();
    });

    const initialCount = MockWebSocket.instances.length;
    const ws = getLastWs();
    act(() => {
      ws.onclose?.();
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(MockWebSocket.instances.length).toBe(initialCount);
    jest.useRealTimers();
  });

  it('clearMessages() empties messages array', async () => {
    const { hook } = await connectFull();
    act(() => {
      hook.result.current.sendMessage('hello');
    });
    expect(hook.result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      hook.result.current.clearMessages();
    });
    expect(hook.result.current.messages).toHaveLength(0);
  });
});

// ─── Event Handling ──────────────────────────────────────────────────────────

describe('useWebSocket - event handling', () => {
  it('ignores non-JSON frames', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      ws.onmessage?.({ data: 'not json' });
    });
    expect(result.current.status).toBe('connecting');
  });

  it('handles shutdown event', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      ws.serverSend({ type: 'event', event: 'shutdown', payload: {} });
    });
    expect(result.current.status).toBe('disconnected');
  });

  it('handles tick event without error', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      ws.serverSend({ type: 'event', event: 'tick', payload: {} });
    });
    expect(result.current.status).toBe('connecting');
  });

  it('sets status to error on ws error', () => {
    const { result } = renderHook(() => useWebSocket(defaultSettings));
    act(() => {
      result.current.connect();
    });
    const ws = getLastWs();
    act(() => {
      ws.onerror?.();
    });
    expect(result.current.status).toBe('error');
  });
});

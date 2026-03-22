import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ChatScreen } from './ChatScreen';
import { AppSettings } from '../../types';

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
  }

  serverSend(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

(global as any).WebSocket = MockWebSocket;

// ─── Mock navigation ─────────────────────────────────────────────────────────

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn().mockReturnValue(true),
  canGoBack: jest.fn().mockReturnValue(false),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn().mockReturnValue(() => {}),
  removeListener: jest.fn(),
} as any;

const settings: AppSettings = {
  gatewayHost: 'localhost',
  gatewayPort: '18789',
  authToken: 'test-token',
};

function getLastWs(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

function getLastSentFrame(ws: MockWebSocket) {
  return JSON.parse(ws.sent[ws.sent.length - 1]);
}

function getSentFrames(ws: MockWebSocket) {
  return ws.sent.map((s) => JSON.parse(s));
}

async function completeHandshake(ws: MockWebSocket) {
  act(() => {
    ws.serverSend({
      type: 'event',
      event: 'connect.challenge',
      payload: { nonce: 'abc', ts: Date.now() },
    });
  });
  const connectReq = getLastSentFrame(ws);
  act(() => {
    ws.serverSend({
      type: 'res',
      id: connectReq.id,
      ok: true,
      payload: { type: 'hello-ok', protocol: 3, server: { version: '1.0', connId: 'c1' } },
    });
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  MockWebSocket.instances = [];
});

describe('ChatScreen integration', () => {
  it('shows empty state when no messages', () => {
    render(<ChatScreen navigation={mockNavigation} settings={{ ...settings, authToken: '' }} />);
    expect(screen.getByText('OpenClaw Client')).toBeTruthy();
    expect(screen.getByText('Go to Settings to configure your gateway connection.')).toBeTruthy();
  });

  it('shows connected prompt when authToken exists', () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    expect(screen.getByText('Connected. Send a message to start.')).toBeTruthy();
  });

  it('connects and shows Connected badge after handshake', async () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    const ws = getLastWs();
    await completeHandshake(ws);
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('full flow: connect → send message → receive streaming response', async () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    const ws = getLastWs();
    await completeHandshake(ws);

    // Type and send a message
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    fireEvent.changeText(input, 'Hello OpenClaw');
    fireEvent.press(screen.getByText('↑'));

    // User message should appear
    expect(screen.getByText('Hello OpenClaw')).toBeTruthy();

    // Verify chat.send was sent
    const chatFrame = getSentFrames(ws).find((f: any) => f.method === 'chat.send');
    expect(chatFrame).toBeDefined();
    expect(chatFrame.params.message).toBe('Hello OpenClaw');

    // Simulate streaming response
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 1, state: 'delta', message: { role: 'assistant', content: 'Hi there' } },
      });
    });

    expect(screen.getByText(/Hi there/)).toBeTruthy();
    expect(screen.getByText('▌')).toBeTruthy(); // Streaming cursor

    // Final message
    act(() => {
      ws.serverSend({
        type: 'event',
        event: 'chat',
        payload: { runId: 'run1', sessionKey: 'main', seq: 2, state: 'final', message: { role: 'assistant', content: 'Hi there! How can I help?' } },
      });
    });

    expect(screen.getByText('Hi there! How can I help?')).toBeTruthy();
    expect(screen.queryByText('▌')).toBeNull(); // Cursor gone
  });

  it('clear button removes all messages', async () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    const ws = getLastWs();
    await completeHandshake(ws);

    // Send a message
    fireEvent.changeText(screen.getByPlaceholderText('Message OpenClaw...'), 'test');
    fireEvent.press(screen.getByText('↑'));
    expect(screen.getByText('test')).toBeTruthy();

    // Clear
    fireEvent.press(screen.getByText('Clear'));
    expect(screen.queryByText('test')).toBeNull();
    expect(screen.getByText('OpenClaw Client')).toBeTruthy(); // Back to empty state
  });

  it('settings button navigates to Settings', () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    fireEvent.press(screen.getByText('Settings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  it('shows connection error status', () => {
    render(<ChatScreen navigation={mockNavigation} settings={settings} />);
    const ws = getLastWs();
    act(() => {
      ws.onerror?.();
    });
    expect(screen.getByText('Connection Error')).toBeTruthy();
  });

  it('input is disabled when not connected', () => {
    render(<ChatScreen navigation={mockNavigation} settings={{ ...settings, authToken: '' }} />);
    const input = screen.getByPlaceholderText('Message OpenClaw...');
    expect(input.props.editable).toBe(false);
  });
});

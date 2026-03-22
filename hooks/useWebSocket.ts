import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  AudioEventPayload,
  ChatEventPayload,
  ChatMessage,
  ChatSendParams,
  ConnectChallengePayload,
  ConnectParams,
  ConnectionStatus,
  EventFrame,
  HelloOkPayload,
  ReqFrame,
  ResFrame,
  WireFrame,
} from '../types';
import { buildWsUrl } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingResolver = (res: ResFrame) => void;

export interface UseWebSocketReturn {
  messages: ChatMessage[];
  status: ConnectionStatus;
  sendMessage: (text: string) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

type OnAudioReceived = (base64Audio: string, format: string) => void;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _seq = 0;
function nextId(): string {
  return `rn_${Date.now()}_${_seq++}`;
}

function makeUserMsg(content: string): ChatMessage {
  return { id: nextId(), role: 'user', content, timestamp: Date.now() };
}

function makeSystemMsg(content: string): ChatMessage {
  return { id: nextId(), role: 'system', content, timestamp: Date.now() };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the WebSocket connection to the OpenClaw gateway using the real
 * protocol: challenge/connect handshake, req/res correlation, chat streaming.
 */
export function useWebSocket(
  settings: AppSettings,
  onAudioReceived?: OnAudioReceived,
): UseWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onAudioRef = useRef(onAudioReceived);
  onAudioRef.current = onAudioReceived;

  // Pending req/res map: id → resolve function
  const pendingRef = useRef<Map<string, PendingResolver>>(new Map());

  // Streaming deltas accumulator: runId → accumulated content
  const streamingRef = useRef<Map<string, { msgId: string; content: string }>>(new Map());

  // ── Send a raw frame ──────────────────────────────────────────────────────

  const sendFrame = useCallback((frame: WireFrame) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(frame));
    }
  }, []);

  // ── Send a req and wait for its res ──────────────────────────────────────

  const sendReq = useCallback(
    <P = unknown>(method: string, params: unknown): Promise<ResFrame<P>> => {
      return new Promise((resolve) => {
        const id = nextId();
        pendingRef.current.set(id, resolve as PendingResolver);
        const frame: ReqFrame = { type: 'req', id, method, params };
        sendFrame(frame);
      });
    },
    [sendFrame],
  );

  // ── Handle incoming event frames ─────────────────────────────────────────

  const handleEvent = useCallback(
    (frame: EventFrame) => {
      switch (frame.event) {
        case 'connect.challenge': {
          // Step 2: respond to the challenge with our connect req
          const { nonce } = frame.payload as ConnectChallengePayload;
          const s = settingsRef.current;
          const params: ConnectParams = {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'openclaw-rn-client',
              version: '1.0.0',
              platform: 'mobile',
              mode: 'ui',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            auth: { token: s.authToken },
          };
          // nonce must be echoed back (device auth); we skip device signing for now
          void sendReq<HelloOkPayload>('connect', { ...params, device: { nonce } }).then((res) => {
            if (res.ok && res.payload?.type === 'hello-ok') {
              setStatus('connected');
            } else {
              setStatus('error');
              setMessages((prev) => [
                ...prev,
                makeSystemMsg(`Auth failed: ${res.error?.message ?? 'unknown error'}`),
              ]);
            }
          });
          setStatus('authenticating');
          break;
        }

        case 'chat': {
          const payload = frame.payload as ChatEventPayload;
          const { runId, state, message } = payload;

          if (!message?.content) break;

          if (state === 'delta') {
            // Accumulate delta into streaming message
            const existing = streamingRef.current.get(runId);
            if (existing) {
              existing.content += message.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === existing.msgId
                    ? { ...m, content: existing.content }
                    : m,
                ),
              );
            } else {
              // First delta for this runId — create a streaming message
              const msgId = nextId();
              streamingRef.current.set(runId, { msgId, content: message.content });
              setMessages((prev) => [
                ...prev,
                {
                  id: msgId,
                  role: 'assistant',
                  content: message.content,
                  timestamp: Date.now(),
                  streaming: true,
                },
              ]);
            }
          } else if (state === 'final') {
            const existing = streamingRef.current.get(runId);
            if (existing) {
              // Mark streaming done, set final content
              const finalContent = existing.content + (message.content ?? '');
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === existing.msgId
                    ? { ...m, content: finalContent, streaming: false }
                    : m,
                ),
              );
              streamingRef.current.delete(runId);
            } else {
              // Non-streaming final (complete message in one shot)
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: 'assistant',
                  content: message.content,
                  timestamp: Date.now(),
                },
              ]);
            }
          } else if (state === 'error' || state === 'aborted') {
            const existing = streamingRef.current.get(runId);
            if (existing) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === existing.msgId
                    ? { ...m, streaming: false, content: existing.content || '[Response interrupted]' }
                    : m,
                ),
              );
              streamingRef.current.delete(runId);
            }
          }
          break;
        }

        case 'audio': {
          // TTS audio from gateway
          const payload = frame.payload as AudioEventPayload;
          if (payload.audio) {
            onAudioRef.current?.(payload.audio, payload.format ?? 'audio/mp3');
          }
          break;
        }

        case 'tick':
          // Server heartbeat — nothing to do
          break;

        case 'shutdown':
          setStatus('disconnected');
          break;

        default:
          // Ignore unknown events
          break;
      }
    },
    [sendReq],
  );

  // ── Handle incoming res frames ────────────────────────────────────────────

  const handleRes = useCallback((frame: ResFrame) => {
    const resolve = pendingRef.current.get(frame.id);
    if (resolve) {
      pendingRef.current.delete(frame.id);
      resolve(frame);
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }
    pendingRef.current.clear();
    streamingRef.current.clear();
    setStatus('disconnected');
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    disconnect();

    const url = buildWsUrl(settingsRef.current);
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let frame: WireFrame;
      try {
        frame = JSON.parse(event.data as string) as WireFrame;
      } catch {
        return; // ignore non-JSON frames
      }

      if (frame.type === 'event') {
        handleEvent(frame as EventFrame);
      } else if (frame.type === 'res') {
        handleRes(frame as ResFrame);
      }
      // req frames from server are unexpected — ignore
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      wsRef.current = null;
      pendingRef.current.clear();
      streamingRef.current.clear();
      setStatus('disconnected');
      // Auto-reconnect after 3s if we have a token
      if (settingsRef.current.authToken) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    // onopen: nothing — we wait for connect.challenge from the server
  }, [disconnect, handleEvent, handleRes]);

  // ── Send a chat message ──────────────────────────────────────────────────

  const sendMessage = useCallback(
    (text: string) => {
      if (status !== 'connected') return;

      // Optimistically add user message to UI
      setMessages((prev) => [...prev, makeUserMsg(text)]);

      const params: ChatSendParams = {
        sessionKey: 'main',
        message: text,
        idempotencyKey: nextId(),
        attachments: [],
      };

      void sendReq('chat.send', params).then((res) => {
        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            makeSystemMsg(`Send failed: ${res.error?.message ?? 'unknown error'}`),
          ]);
        }
      });
    },
    [status, sendReq],
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingRef.current.clear();
  }, []);

  return { messages, status, sendMessage, connect, disconnect, clearMessages };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  AppSettings,
  ChatEventPayload,
  ChatMessage,
  ChatSendParams,
  ConnectParams,
  ConnectionStatus,
  EventFrame,
  HelloOkPayload,
  ReqFrame,
  ResFrame,
  WireFrame,
} from '../types';
import { buildWsUrl } from '../utils/storage';
import { nextId, extractText, makeUserMsg, makeSystemMsg } from '../utils/chatHelpers';
import { lightTap } from '../utils/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingResolver = (res: ResFrame) => void;

export interface UseWebSocketOptions {
  initialMessages?: ChatMessage[];
  onAudioReceived?: OnAudioReceived;
}

export interface UseWebSocketReturn {
  messages: ChatMessage[];
  status: ConnectionStatus;
  /** Seconds until next reconnect attempt (0 when not reconnecting) */
  reconnectIn: number;
  /** True while waiting for the assistant's first response after sending */
  isTyping: boolean;
  sendMessage: (text: string) => void;
  /** Retry a failed message by its system error message id */
  retryMessage: (errorMsgId: string) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  deleteMessage: (msgId: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the WebSocket connection to the OpenClaw gateway using the real
 * protocol: challenge/connect handshake, req/res correlation, chat streaming.
 */
type OnAudioReceived = (base64Audio: string, format: string) => void;

export function useWebSocket(
  settings: AppSettings,
  options?: OnAudioReceived | UseWebSocketOptions,
): UseWebSocketReturn {
  // Support legacy signature: useWebSocket(settings, onAudioCallback)
  const opts: UseWebSocketOptions = typeof options === 'function'
    ? { onAudioReceived: options }
    : options ?? {};

  const [messages, setMessages] = useState<ChatMessage[]>(opts.initialMessages ?? []);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectIn, setReconnectIn] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const reconnectAttempt = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onAudioRef = useRef(opts.onAudioReceived);
  onAudioRef.current = opts.onAudioReceived;


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

  // ── Speak assistant text via Edge TTS, fallback to device TTS ───────────

  const speakText = useCallback(
    async (text: string) => {
      // Strip emojis unless the message is emoji-only
      const withoutEmoji = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s{2,}/g, ' ').trim();
      const toSpeak = withoutEmoji || text.trim();
      if (!toSpeak) return;

      try {
        const res = await sendReq<{ audioBase64?: string; outputFormat?: string }>('tts.convert', {
          text: toSpeak,
          includeBase64: true,
        });
        if (res.ok && res.payload?.audioBase64) {
          const format = res.payload.outputFormat ?? 'audio/mp3';
          onAudioRef.current?.(res.payload.audioBase64, format);
          return;
        }
      } catch {
        // Fall through to device TTS
      }

      // Fallback: device TTS
      try {
        void Speech.stop();
        Speech.speak(toSpeak);
      } catch {
        // TTS is best-effort
      }
    },
    [sendReq],
  );

  // ── Handle incoming event frames ─────────────────────────────────────────

  const handleEvent = useCallback(
    (frame: EventFrame) => {
      switch (frame.event) {
        case 'connect.challenge': {
          // Step 2: respond to the challenge with our connect req
          const s = settingsRef.current;
          const params: ConnectParams = {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'openclaw-control-ui',
              version: '1.0.0',
              platform: 'mobile',
              mode: 'ui',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            auth: { token: s.authToken },
          };
          void sendReq<HelloOkPayload>('connect', params).then((res) => {
            if (res.ok && res.payload?.type === 'hello-ok') {
              reconnectAttempt.current = 0;
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
          setIsTyping(false);
          const payload = frame.payload as ChatEventPayload;
          const { runId, state, message } = payload;

          if (!message?.content) break;
          const text = extractText(message.content);
          if (!text) break;

          if (state === 'delta') {
            // Each delta contains the full accumulated text so far
            const existing = streamingRef.current.get(runId);
            if (existing) {
              existing.content = text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === existing.msgId
                    ? { ...m, content: text }
                    : m,
                ),
              );
            } else {
              // First delta for this runId — create a streaming message
              const msgId = nextId();
              streamingRef.current.set(runId, { msgId, content: text });
              setMessages((prev) => [
                ...prev,
                {
                  id: msgId,
                  role: 'assistant',
                  content: text,
                  timestamp: Date.now(),
                  streaming: true,
                },
              ]);
            }
          } else if (state === 'final') {
            let finalContent: string;
            const existing = streamingRef.current.get(runId);
            if (existing) {
              // Mark streaming done — final contains the complete text
              const finalText = extractText(message.content);
              finalContent = finalText || existing.content;
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
              finalContent = text;
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: 'assistant',
                  content: text,
                  timestamp: Date.now(),
                },
              ]);
            }
            // Haptic + TTS for the final assistant message
            if (finalContent) {
              lightTap();
              void speakText(finalContent);
            }
          } else {
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
    [sendReq, speakText],
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
    clearInterval(countdownTimer.current);
    setReconnectIn(0);
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
      // Auto-reconnect with exponential backoff (3s, 6s, 12s, … capped at 30s)
      if (settingsRef.current.authToken) {
        const delay = Math.min(3000 * 2 ** reconnectAttempt.current, 30000);
        reconnectAttempt.current += 1;
        const delaySec = Math.ceil(delay / 1000);
        setReconnectIn(delaySec);
        setStatus('reconnecting');
        countdownTimer.current = setInterval(() => {
          setReconnectIn((prev) => {
            if (prev <= 1) {
              clearInterval(countdownTimer.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setStatus('disconnected');
      }
    };

    // onopen: nothing — we wait for connect.challenge from the server
  }, [disconnect, handleEvent, handleRes]);

  // ── Send a chat message ──────────────────────────────────────────────────

  const sendMessage = useCallback(
    (text: string) => {
      if (status !== 'connected') return;

      lightTap();
      setIsTyping(true);
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
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { ...makeSystemMsg(`Send failed: ${res.error?.message ?? 'unknown error'}`), retryText: text },
          ]);
        }
      });
    },
    [status, sendReq],
  );

  // ── Retry a failed message ──────────────────────────────────────────────

  const retryMessage = useCallback(
    (errorMsgId: string) => {
      const errorMsg = messages.find((m) => m.id === errorMsgId);
      if (!errorMsg?.retryText) return;
      const text = errorMsg.retryText;
      // Remove the error message
      setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
      // Resend
      sendMessage(text);
    },
    [messages, sendMessage],
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingRef.current.clear();
  }, []);

  const deleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }, []);

  return { messages, status, reconnectIn, isTyping, sendMessage, retryMessage, connect, disconnect, clearMessages, deleteMessage };
}

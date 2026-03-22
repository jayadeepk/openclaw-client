// ─── Wire Protocol Frames ────────────────────────────────────────────────────

/** Client → Server request */
export interface ReqFrame<P = unknown> {
  type: 'req';
  id: string;
  method: string;
  params: P;
}

/** Server → Client response (matches a req by id) */
export interface ResFrame<P = unknown> {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: P;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    retryAfterMs?: number | null;
  };
}

/** Server → Client unsolicited event */
export interface EventFrame<P = unknown> {
  type: 'event';
  event: string;
  payload: P;
  seq?: number;
  stateVersion?: Record<string, number>;
}

export type WireFrame = ReqFrame | ResFrame | EventFrame;

// ─── Handshake ───────────────────────────────────────────────────────────────

export interface ConnectChallengePayload {
  nonce: string;
  ts: number;
}

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    version: string;
    platform: string;
    mode: string;
  };
  role: 'operator';
  scopes: string[];
  auth: {
    token: string;
  };
}

export interface HelloOkPayload {
  type: 'hello-ok';
  protocol: number;
  server: {
    version: string;
    connId: string;
  };
  features?: {
    methods?: string[];
    events?: string[];
  };
  snapshot?: Record<string, unknown>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatState = 'delta' | 'final' | 'error' | 'aborted';

export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: ChatState;
  message?: {
    role: 'assistant' | 'user' | 'system';
    content: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: string;
  error?: string;
}

export interface ChatSendParams {
  sessionKey: string;
  message: string;
  idempotencyKey: string;
  attachments?: unknown[];
}

// ─── TTS / Audio ──────────────────────────────────────────────────────────────

export interface AudioEventPayload {
  /** Base64-encoded audio data */
  audio: string;
  /** MIME type e.g. "audio/mp3" */
  format?: string;
  /** Associated runId if linked to a chat turn */
  runId?: string;
}

// ─── App Types ────────────────────────────────────────────────────────────────

/** A single message in the chat UI */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** True while the assistant is still streaming */
  streaming?: boolean;
  /** Original text to resend on retry (only on system error messages) */
  retryText?: string;
}

/** A single conversation */
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** Persisted settings */
export interface AppSettings {
  gatewayHost: string;
  gatewayPort: string;
  authToken: string;
}

/** WebSocket connection state */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'error';

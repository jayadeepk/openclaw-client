# OpenClaw Wire Protocol

This document describes the WebSocket protocol between the client and the OpenClaw gateway.

## Connection

The client connects via WebSocket to `ws://{gatewayHost}:{gatewayPort}`.

## Frame Format

All frames are JSON objects with a `type` field:

### Request Frame (Client → Server)

```typescript
{
  type: 'req',
  id: string,        // Unique request ID (e.g., "rn_1719849600000_0")
  method: string,    // Method name
  params: unknown    // Method-specific parameters
}
```

### Response Frame (Server → Client)

```typescript
{
  type: 'res',
  id: string,        // Matches the request ID
  ok: boolean,       // Success or failure
  payload?: unknown,  // Method-specific response data
  error?: {
    code: string,
    message: string,
    retryable?: boolean,
    retryAfterMs?: number | null
  }
}
```

### Event Frame (Server → Client)

```typescript
{
  type: 'event',
  event: string,     // Event name
  payload: unknown,  // Event-specific data
  seq?: number,
  stateVersion?: Record<string, number>
}
```

## Handshake

### 1. Server sends `connect.challenge`

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": {
    "nonce": "abc123",
    "ts": 1719849600000
  }
}
```

### 2. Client sends `connect` request

```json
{
  "type": "req",
  "id": "rn_1719849600000_0",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "openclaw-control-ui",
      "version": "1.0.0",
      "platform": "mobile",
      "mode": "ui"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "auth": {
      "token": "your-auth-token"
    }
  }
}
```

### 3. Server sends `hello-ok` response

```json
{
  "type": "res",
  "id": "rn_1719849600000_0",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": {
      "version": "1.0.0",
      "connId": "conn_abc123"
    },
    "features": {
      "methods": ["chat.send", "tts.convert"],
      "events": ["chat", "tick", "shutdown"]
    }
  }
}
```

## Methods

### `chat.send`

Send a chat message.

**Request params:**
```typescript
{
  sessionKey: string,      // Session identifier (default: "main")
  message: string,         // Message text
  idempotencyKey: string,  // Unique key to prevent duplicates
  attachments: unknown[]   // File attachments (currently empty)
}
```

**Response:** `ok: true` on acceptance, `ok: false` with error on failure.

### `tts.convert`

Convert text to speech audio.

**Request params:**
```typescript
{
  text: string,           // Text to convert
  includeBase64: true     // Request base64-encoded audio
}
```

**Success response payload:**
```typescript
{
  audioBase64: string,      // Base64-encoded audio data
  outputFormat?: string     // MIME type (default: "audio/mp3")
}
```

## Events

### `chat`

Streamed chat response from the assistant.

```typescript
{
  runId: string,           // Unique run identifier
  sessionKey: string,
  seq: number,             // Sequence number within run
  state: 'delta' | 'final' | 'error' | 'aborted',
  message?: {
    role: 'assistant',
    content: string        // Accumulated text (delta) or complete text (final)
  },
  usage?: {
    inputTokens: number,
    outputTokens: number
  },
  stopReason?: string,
  error?: string
}
```

**States:**
- `delta` — Streaming in progress. Content contains the full accumulated text so far.
- `final` — Streaming complete. Content is the final text.
- `error` — An error occurred during generation.
- `aborted` — Generation was cancelled.

### `tick`

Server heartbeat. No action required.

### `shutdown`

Server is shutting down. Client should expect disconnection.

## Connection Lifecycle

```
Client                          Server
  |                               |
  |---- WebSocket connect ------->|
  |                               |
  |<--- connect.challenge --------|
  |                               |
  |---- connect (auth token) ---->|
  |                               |
  |<--- hello-ok -----------------|
  |                               |
  |---- chat.send --------------->|
  |                               |
  |<--- chat (delta) -------------|
  |<--- chat (delta) -------------|
  |<--- chat (final) -------------|
  |                               |
  |---- tts.convert ------------->|
  |<--- audio base64 -------------|
  |                               |
  |<--- tick ---------------------|
  |                               |
  |<--- shutdown -----------------|
  |                               |
  X---- connection closed --------X
```

## Auto-Reconnect

If the WebSocket closes and the client has an auth token configured, it automatically attempts to reconnect after 3 seconds. The full handshake is repeated on each reconnection.

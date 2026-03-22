# Architecture

## Overview

OpenClaw Client is a React Native mobile chat application built with Expo SDK 54. It connects to an OpenClaw gateway server over WebSocket, providing real-time chat with text-to-speech (TTS) support.

## Tech Stack

- **Framework:** Expo 54 / React Native 0.81.5
- **Language:** TypeScript 5.1 (strict mode)
- **React:** 19.1.0
- **Navigation:** React Navigation 6 (native stack)
- **Storage:** AsyncStorage for persisted settings
- **Audio:** expo-av (playback), expo-speech (device TTS fallback)
- **Platforms:** iOS, Android, Web

## Project Structure

```
openclaw-client/
├── app/
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Root navigator, settings state
│   └── screens/
│       ├── ChatScreen.tsx         # Main chat UI
│       └── SettingsScreen.tsx     # Gateway configuration form
├── components/
│   ├── ChatInput.tsx              # Text input + send button
│   ├── ConnectionBadge.tsx        # Connection status pill
│   └── MessageBubble.tsx          # Chat message display
├── constants/
│   └── theme.ts                   # Dark theme tokens
├── hooks/
│   ├── useAudioPlayer.ts          # Base64 audio playback
│   └── useWebSocket.ts            # WebSocket protocol + chat logic
├── types/
│   └── index.ts                   # All TypeScript interfaces
├── utils/
│   ├── chatHelpers.ts             # ID generation, text extraction
│   └── storage.ts                 # AsyncStorage settings persistence
└── App.tsx                        # Entry point
```

## Data Flow

```
AppNavigator (settings state)
  ├── ChatScreen
  │     ├── useWebSocket(settings) → messages, status, sendMessage
  │     ├── useAudioPlayer() → playAudio, stopAudio
  │     ├── ConnectionBadge(status)
  │     ├── MessageBubble(message) × N
  │     └── ChatInput(onSend, disabled)
  └── SettingsScreen(settings, onSave)
```

1. **AppNavigator** loads settings from AsyncStorage on mount and holds them in state.
2. **ChatScreen** receives settings, passes them to `useWebSocket` which manages the connection.
3. When the user sends a message, `useWebSocket` adds it optimistically and sends a `chat.send` frame.
4. The gateway streams back `chat` events (delta → final), which accumulate into assistant messages.
5. On `final`, the hook requests TTS via `tts.convert`. If the gateway returns audio, it's played via `useAudioPlayer`. Otherwise, device TTS (`expo-speech`) is used as fallback.

## WebSocket Protocol

The app implements the OpenClaw wire protocol:

### Frame Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `req` | Client → Server | Request with method + params |
| `res` | Server → Client | Response matching a req by ID |
| `event` | Server → Client | Unsolicited server event |

### Connection Handshake

```
1. Client opens WebSocket to ws://host:port
2. Server sends event: connect.challenge (nonce, timestamp)
3. Client sends req: connect (protocol version, auth token, scopes)
4. Server sends res: hello-ok (server info, features)
```

### Chat Streaming

```
1. Client sends req: chat.send (sessionKey, message, idempotencyKey)
2. Server sends event: chat (state: delta, content accumulated)
3. Server sends event: chat (state: delta, more content)
4. Server sends event: chat (state: final, complete content)
```

States: `delta` (streaming), `final` (complete), `error`, `aborted`

### Request/Response Correlation

Each `req` frame has a unique ID (`rn_{timestamp}_{seq}`). The hook stores a Promise resolver in a `pendingRef` Map keyed by ID. When a `res` frame arrives, the matching resolver is called.

### Auto-Reconnect

On WebSocket close, if `authToken` is set, the hook schedules a reconnect after 3 seconds.

## State Management

No external state library. State is managed with React hooks:

- **Settings** — `useState` in AppNavigator, persisted to AsyncStorage
- **Chat messages** — `useState` in `useWebSocket`
- **Connection status** — `useState` in `useWebSocket`
- **Streaming state** — `useRef` Maps in `useWebSocket` (runId → accumulated content)
- **Pending requests** — `useRef` Map in `useWebSocket` (id → resolver)

## TTS Pipeline

```
Final message received
  → Strip emojis (unless emoji-only)
  → Send tts.convert to gateway
  → If success: play base64 audio via useAudioPlayer
  → If failure: fall back to expo-speech (device TTS)
```

## Theme

Dark theme defined in `constants/theme.ts`:
- Background: `#0a0a0f`
- Primary: `#6c63ff`
- Accent: `#00d4aa`
- Error: `#ff4466`
- Spacing scale: 4, 8, 16, 24, 32

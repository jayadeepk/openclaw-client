# OpenClaw Client

[![CI](https://github.com/jayadeepk/openclaw-client/actions/workflows/ci.yml/badge.svg)](https://github.com/jayadeepk/openclaw-client/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey)](https://expo.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A React Native/Expo chat app that connects to an [OpenClaw](https://github.com/anthropics/openclaw) gateway over WebSocket. The only OpenClaw client with **auto-play TTS** — every assistant response is spoken aloud automatically.

## Auto-Play TTS

When the assistant finishes a response, the client automatically converts it to speech and plays it back — no tap required. This makes it usable as a hands-free, voice-forward interface.

**How it works:**

1. Assistant response completes (streamed via WebSocket)
2. Client sends a `tts.convert` request to the gateway with the full text
3. Gateway returns base64-encoded audio → played via `expo-av`
4. If the gateway is unavailable or TTS fails, falls back to on-device speech (`expo-speech`)

Emoji-only messages are spoken as-is; mixed text has emojis stripped before synthesis to avoid the TTS engine reading out emoji names.

## Other Features

- Real-time chat via WebSocket with streaming responses
- Auto-reconnect with exponential backoff and countdown indicator
- Haptic feedback on send and receive
- Message persistence across app restarts
- Dark theme

## Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An OpenClaw gateway instance

## Getting Started

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start

# Or target a specific platform
npm run android
npm run ios
npm run web
```

If your dev machine's IP isn't detected correctly (VPN, multiple NICs), create a `.env` file:

```
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100
```

## Development

```bash
npm run check        # typecheck + lint + test
npm test             # jest only
npm run lint         # eslint only
npm run typecheck    # tsc only
```

Pre-commit hooks run ESLint on staged `.ts`/`.tsx` files via Husky + lint-staged.

## Project Structure

```
app/
  navigation/AppNavigator.tsx    # Root navigator, settings state
  screens/
    ChatScreen.tsx               # Main chat UI
    SettingsScreen.tsx            # Gateway configuration
components/
  ChatInput.tsx                  # Text input + send button
  ConnectionBadge.tsx            # Connection status pill
  MessageBubble.tsx              # Chat message display
  TypingIndicator.tsx            # Typing animation
hooks/
  useWebSocket.ts                # WebSocket protocol + chat logic
  useAudioPlayer.ts              # Base64 audio playback
utils/
  chatHelpers.ts                 # ID generation, text extraction
  storage.ts                     # AsyncStorage persistence
  haptics.ts                     # Haptic feedback
types/index.ts                   # TypeScript interfaces
docs/                            # Architecture & protocol docs
```

## Protocol

The app implements the OpenClaw wire protocol over WebSocket. See [docs/api-protocol.md](docs/api-protocol.md) for the full spec.

## License

MIT

# OpenClaw Client

[![CI](https://github.com/jayadeepk/openclaw-client/actions/workflows/ci.yml/badge.svg)](https://github.com/jayadeepk/openclaw-client/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/endpoint?url=https%3A%2F%2Fjayadeepk.github.io%2Fopenclaw-client%2Ftests.json)](https://jayadeepk.github.io/openclaw-client/tests/)
[![Coverage](https://img.shields.io/endpoint?url=https://jayadeepk.github.io/openclaw-client/coverage.json)](https://jayadeepk.github.io/openclaw-client/coverage/lcov-report/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey)](https://expo.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A React Native/Expo chat app that connects to an [OpenClaw](https://github.com/anthropics/openclaw) gateway over WebSocket. The only OpenClaw client with **auto-play TTS** — every assistant response is spoken aloud automatically.

## Auto-Play TTS

Every assistant response is automatically converted to speech and played back — no tap required. Falls back to on-device speech (`expo-speech`) if the gateway TTS is unavailable.

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

# Development Guide

## Prerequisites

- Node.js 20+
- npm
- Expo CLI (`npx expo`)
- iOS Simulator (macOS) or Android emulator, or physical device with Expo Go

## Setup

```bash
git clone git@github.com:jayadeepk/openclaw-client.git
cd openclaw-client
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is required because `@testing-library/react-native` v13 has a peer dependency on `react-test-renderer@^19.2.4`, but Expo 54 pins `react@19.1.0`.

## Running the App

```bash
npm start              # Start Expo dev server
npm run android        # Start on Android
npm run ios            # Start on iOS
npm run web            # Start on web
```

## Configuration

The app connects to an OpenClaw gateway via WebSocket. Configure the connection in the Settings screen:

- **Gateway Host** — IP or hostname of the gateway server
- **Gateway Port** — WebSocket port (default: 18789)
- **Auth Token** — Authentication token for the gateway

Settings are persisted to AsyncStorage under the key `@openclaw/settings`.

## Environment

The `.env` file contains `REACT_NATIVE_PACKAGER_HOSTNAME` for network configuration. This is not committed to git.

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start Expo dev server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint linting |
| `npm run check` | Full validation: typecheck + lint + test |

## Project Conventions

- **Co-located tests** — Test files live next to the source they test (`Foo.tsx` → `Foo.test.tsx`)
- **Snapshot tests** — Named `*.snapshot.test.tsx`, stored in `__snapshots__/` directories
- **Integration tests** — Named `*.integration.test.tsx`
- **No default exports** — All components use named exports
- **Theme tokens** — Use `theme.colors`, `theme.spacing`, etc. instead of inline values

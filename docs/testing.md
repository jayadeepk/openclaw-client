# Testing

## Overview

- **Framework:** Jest 29 with jest-expo preset
- **Component testing:** @testing-library/react-native
- **112 tests** across 13 test suites
- **13 snapshots** for UI regression detection
- **~5s** total run time
- **Coverage:** 98.4% statements, 88.2% branches, 100% functions, 99.6% lines

## Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npx jest path/to/file       # Run specific test file
npx jest -u                 # Update snapshots
```

## Test Structure

Tests are co-located next to their source files:

```
utils/
  storage.ts
  storage.test.ts              # Unit tests for storage utils
  chatHelpers.ts
  chatHelpers.test.ts          # Unit tests for helpers
hooks/
  useWebSocket.ts
  useWebSocket.test.ts         # Hook tests (protocol, streaming, TTS)
  useAudioPlayer.ts
  useAudioPlayer.test.ts       # Hook tests (playback, MIME types)
components/
  ChatInput.tsx
  ChatInput.test.tsx            # Behavior tests
  ChatInput.snapshot.test.tsx   # Snapshot test
  MessageBubble.tsx
  MessageBubble.test.tsx
  MessageBubble.snapshot.test.tsx
  ConnectionBadge.tsx
  ConnectionBadge.test.tsx
  ConnectionBadge.snapshot.test.tsx
app/screens/
  SettingsScreen.tsx
  SettingsScreen.test.tsx
  SettingsScreen.snapshot.test.tsx
  ChatScreen.tsx
  ChatScreen.integration.test.tsx  # Full-flow integration test
```

## Test Categories

### Unit Tests (pure functions)
- `storage.test.ts` — loadSettings, saveSettings, buildWsUrl
- `chatHelpers.test.ts` — nextId, extractText, makeUserMsg, makeSystemMsg

### Hook Tests
- `useWebSocket.test.ts` — Connection lifecycle, chat streaming, TTS, reconnection, event handling. Uses a `MockWebSocket` class to simulate server frames.
- `useAudioPlayer.test.ts` — Audio playback, MIME type mapping, cleanup callbacks

### Component Tests
- `ChatInput.test.tsx` — Send behavior, trimming, disabled states
- `MessageBubble.test.tsx` — Role labels, streaming cursor, content rendering
- `ConnectionBadge.test.tsx` — Status label mapping for all 5 states
- `SettingsScreen.test.tsx` — Form validation, save callbacks, navigation

### Snapshot Tests
- `ChatInput.snapshot.test.tsx` — Enabled/disabled states
- `MessageBubble.snapshot.test.tsx` — User/assistant/system/streaming variants
- `ConnectionBadge.snapshot.test.tsx` — All 5 connection statuses
- `SettingsScreen.snapshot.test.tsx` — With/without settings

### Integration Tests
- `ChatScreen.integration.test.tsx` — Full flow: connect, handshake, send message, receive streaming response, clear messages, navigation, error states

## Mocking Strategy

Native modules are mocked globally in `jest.setup.ts`:

| Module | Mock Approach |
|--------|--------------|
| `@react-native-async-storage/async-storage` | `jest.fn()` for getItem, setItem |
| `expo-speech` | `jest.fn()` for speak, stop |
| `expo-av` | Mock Audio.Sound.createAsync returning controllable sound |
| `expo-file-system` | Mock File constructor + Paths |
| `react-native-safe-area-context` | Mock useSafeAreaInsets returning zeroes |

Test-specific mocks:
| Module | Where | Approach |
|--------|-------|----------|
| `WebSocket` | useWebSocket.test.ts | Custom `MockWebSocket` class on `global.WebSocket` |
| `Alert` | SettingsScreen.test.ts | `jest.spyOn(Alert, 'alert')` |
| Navigation | ChatScreen.integration.test.tsx | Mock navigation object with jest.fn() methods |

## Writing New Tests

### Unit test for a utility
```typescript
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('does something', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Component test
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders and responds to interaction', () => {
    render(<MyComponent onPress={jest.fn()} />);
    fireEvent.press(screen.getByText('Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Snapshot test
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent snapshots', () => {
  it('default state', () => {
    const { toJSON } = render(<MyComponent />);
    expect(toJSON()).toMatchSnapshot();
  });
});
```

### Testing the WebSocket hook
```typescript
// Use the MockWebSocket pattern from useWebSocket.test.ts
const { hook, ws } = await connectFull();  // Helper that completes handshake
act(() => {
  ws.serverSend({ type: 'event', event: 'chat', payload: { ... } });
});
expect(hook.result.current.messages).toHaveLength(1);
```

## Updating Snapshots

When you intentionally change a component's output:
```bash
npx jest -u                      # Update all snapshots
npx jest -u components/Foo       # Update specific file's snapshots
```

Review snapshot diffs carefully — they should reflect only your intended changes.

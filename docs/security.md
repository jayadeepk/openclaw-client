# Security

Overview of security measures in the OpenClaw Client.

## Auth Token Storage

The auth token is the most sensitive piece of data the client handles. Storage varies by platform:

| Platform | Mechanism | Encrypted at rest |
|----------|-----------|-------------------|
| iOS | `expo-secure-store` (Keychain) | Yes |
| Android | `expo-secure-store` (Keystore) | Yes |
| Web | `localStorage` | No |

On native platforms, `expo-secure-store` leverages the OS-level keychain/keystore, which encrypts values and ties them to the app's identity. On web, `localStorage` is scoped per origin so other sites cannot access it, but it is readable by any JavaScript running on the same origin.

The auth token is separated from other settings during persistence — `saveSettings()` in `utils/storage.ts` strips the token and stores it via `tokenStore`, while non-sensitive settings (host, port) go to `AsyncStorage`.

## Content Security Policy (Web)

The web build includes a CSP meta tag in `public/index.html` that mitigates cross-site scripting (XSS) attacks. This is the primary defense for the auth token stored in `localStorage` on web.

**Policy directives:**

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Blocks all resources not explicitly allowed |
| `script-src` | `'self'` | Only scripts from the app's origin can execute — blocks injected remote scripts |
| `style-src` | `'self' 'unsafe-inline'` | Allows inline styles (required by React Native Web) |
| `connect-src` | `'self' ws: wss:` | Allows fetch/XHR to the app's origin and WebSocket connections to the gateway |
| `img-src` | `'self' data:` | Allows images from the app's origin and data URIs |
| `font-src` | `'self'` | Fonts from the app's origin only |
| `object-src` | `'none'` | Blocks plugins (Flash, Java applets, etc.) |
| `base-uri` | `'self'` | Prevents `<base>` tag hijacking |
| `form-action` | `'self'` | Prevents form submissions to external sites |

## WebSocket Connection

- The client connects to the gateway via `ws://` or `wss://` using the host and port from settings (`utils/storage.ts:buildWsUrl`).
- Auth is performed as the first message after the WebSocket connection opens — the client sends an `auth` frame containing the token (`hooks/useWebSocket.ts`).
- If authentication fails, the connection is closed and a system message is displayed to the user.

## Data Persistence

| Data | Storage | Scope |
|------|---------|-------|
| Auth token | `SecureStore` (native) / `localStorage` (web) | Per-app (native) / per-origin (web) |
| Settings (host, port) | `AsyncStorage` | Per-app |
| Chat messages | `AsyncStorage` | Per-app, capped at 100 messages |

- Streaming (in-progress) messages are excluded from persistence.
- `AsyncStorage` values are plain-text JSON. They do not contain secrets.

## Known Limitations

- **Web auth token** — stored in `localStorage` which is accessible to any JavaScript on the same origin. The CSP mitigates this by blocking unauthorized scripts, but an `httpOnly` cookie would be more robust (requires gateway-side changes).
- **`style-src 'unsafe-inline'`** — required by React Native Web's runtime styling. This is a common trade-off for RN Web apps; it weakens CSP's style injection protection but does not affect script injection protection.
- **`ws://` connections** — unencrypted by default. Production deployments should use `wss://` with TLS termination.

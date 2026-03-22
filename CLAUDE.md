# OpenClaw Client

React Native/Expo 54 chat app connecting to an OpenClaw gateway via WebSocket.

## Quick Reference

```bash
npm run check          # typecheck + lint + test (run before committing)
npm test               # jest only
npm run lint           # eslint only
npm run typecheck      # tsc only
npx jest -u            # update snapshots
```

## Conventions

- TypeScript strict mode, type-checked eslint (`recommendedTypeChecked`)
- Named exports only (no default exports)
- Tests co-located next to source files (`Foo.tsx` → `Foo.test.tsx`)
- Snapshot tests in `*.snapshot.test.tsx`
- Theme tokens from `constants/theme.ts` — no inline colors/spacing
- `void` keyword for intentionally unhandled promises

## Workflow

- After completing any change that is tested and passing, commit and push automatically
- Run `npm run check` before committing to verify nothing is broken

## Key Files

- `hooks/useWebSocket.ts` — Core protocol logic (most complex file)
- `utils/chatHelpers.ts` — Pure helpers extracted for testability
- `types/index.ts` — All TypeScript interfaces
- `docs/` — Architecture, testing, protocol docs

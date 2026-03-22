# CI Pipeline & Git Hooks

## Pre-Commit Hook

Managed by [Husky](https://typicode.github.io/husky/). Runs automatically on every `git commit`:

```bash
npx tsc --noEmit       # 1. Type checking
npx lint-staged        # 2. ESLint --fix on staged .ts/.tsx files
npx jest               # 3. All tests
```

If any step fails, the commit is blocked. Fix the issue and try again.

### Bypassing (use sparingly)

```bash
git commit --no-verify -m "message"
```

This skips the hook entirely. The CI pipeline will still catch issues on push.

### Setup

Husky is initialized via the `prepare` script in package.json, which runs automatically after `npm install`. If hooks aren't working:

```bash
npx husky
```

## CI Pipeline

GitHub Actions workflow at `.github/workflows/ci.yml`. Runs on:
- Every push to `main`
- Every pull request targeting `main`

### Steps

| Step | Command | Purpose |
|------|---------|---------|
| Checkout | `actions/checkout@v4` | Clone repo |
| Setup Node | `actions/setup-node@v4` (Node 20) | Install Node with npm cache |
| Install | `npm ci --legacy-peer-deps` | Clean install dependencies |
| Typecheck | `npx tsc --noEmit` | Catch type errors |
| Lint | `npx eslint .` | Catch lint violations |
| Test | `npx jest --coverage` | Run tests + coverage report |

### Why `--legacy-peer-deps`?

`@testing-library/react-native` v13 depends on `react-test-renderer` which requires `react@^19.2.4`, but Expo 54 pins `react@19.1.0`. This is a semver range conflict, not an actual incompatibility. The flag tells npm to ignore it.

## ESLint Configuration

Uses `typescript-eslint` v8 with **type-checked** linting (`recommendedTypeChecked`):

- **Type-aware rules** — catches floating promises, unsafe returns, misused promises
- **projectService** — uses the same TS service as your editor
- **Test files** — relaxed rules (allows `any`, unsafe access, floating promises)
- **JS config files** — type checking disabled

Key rules:
| Rule | Level | Notes |
|------|-------|-------|
| `no-floating-promises` | error | Must `await`, `.catch()`, or `void` promises |
| `no-unsafe-return` | error | Don't return `any` from typed functions |
| `no-misused-promises` | error | Don't pass async functions where void expected |
| `no-unused-vars` | warn | Prefix unused args with `_` |
| `no-explicit-any` | warn (off in tests) | Prefer specific types |

## Quality Gate Summary

A commit must pass all three checks locally (pre-commit hook), and the same checks run in CI as a safety net:

```
tsc --noEmit    →  Type safety
eslint .        →  Code quality + type-aware rules
jest            →  112 tests + 13 snapshots
```

Total validation time: ~7 seconds locally.

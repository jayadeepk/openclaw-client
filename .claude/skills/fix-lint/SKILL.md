---
name: fix-lint
description: Auto-fix all ESLint violations in the codebase.
disable-model-invocation: false
allowed-tools: Bash, Read, Edit
---

Fix all ESLint violations.

## Steps

1. Run `npx eslint . --fix` to auto-fix what's possible
2. Run `npx eslint .` again to see remaining issues
3. For remaining issues, read the affected files and fix them manually
4. Run `npx tsc --noEmit` to verify fixes didn't break types
5. Run `npx jest` to verify fixes didn't break tests

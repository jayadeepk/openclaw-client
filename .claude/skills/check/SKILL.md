---
name: check
description: Run full validation — typecheck, lint, and all tests. Use after making any code changes.
disable-model-invocation: false
allowed-tools: Bash
---

Run the full validation suite and report results.

## Steps

1. Run `npx tsc --noEmit` — report any type errors
2. Run `npx eslint .` — report any lint violations
3. Run `npx jest` — report test results
4. If anything fails, diagnose and fix the issue, then re-run

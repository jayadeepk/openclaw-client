---
name: review-changes
description: Review uncommitted changes for correctness, type safety, and test coverage.
disable-model-invocation: false
allowed-tools: Bash, Read, Grep
---

Review all uncommitted changes in the working tree.

## Steps

1. Run `git diff` to see all changes
2. Run `npx tsc --noEmit` to check for type errors
3. Run `npx eslint .` to check for lint issues
4. Run `npx jest --coverage` to check test results and coverage
5. For each changed source file, check if it has corresponding test coverage
6. Report:
   - Summary of changes
   - Any type/lint issues found
   - Test results and coverage gaps
   - Suggestions for improvement

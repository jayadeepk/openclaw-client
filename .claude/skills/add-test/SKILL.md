---
name: add-test
description: Add tests for a source file. Follows project conventions for co-located tests.
disable-model-invocation: true
argument-hint: [file-path]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Write tests for `$0`.

## Steps

1. Read `$0` to understand what it does
2. Read existing test files nearby for patterns and conventions
3. Create a co-located test file next to the source (e.g., `Foo.tsx` → `Foo.test.tsx`)
4. For React components, also create a snapshot test (`Foo.snapshot.test.tsx`)
5. Follow the mocking patterns from `jest.setup.ts` for native modules
6. For hooks, use `renderHook` from `@testing-library/react-native`
7. For components, use `render`, `screen`, `fireEvent` from `@testing-library/react-native`
8. Run `npx jest $0` to verify tests pass (jest will match the test file)
9. Run `npx jest --coverage` and report coverage for the file

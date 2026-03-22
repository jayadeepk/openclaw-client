---
name: implement-feature
description: Pick the top feature from the backlog, implement it with tests, run checks, commit, push, and move it to completed. Loop-safe.
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

Implement the next feature from the backlog. Safe to run in a loop via `/loop /implement-feature`.

## Steps

- **Branch guard** — Run `git branch --show-current`. This skill must run on `dev`.
  - If already on `dev`: continue
  - If on any other branch (including `main`): attempt to switch to `dev`:
    - If `dev` exists: `git checkout dev`
    - If `dev` does not exist: `git checkout -b dev`
    - If the switch fails (e.g. uncommitted changes), report the issue and **stop gracefully**

- **Read the backlog** — Read `docs/features-backlog.md` and identify the first top-level bullet (a line matching `^- `). Include all its indented children (lines starting with two or more spaces followed by `- ` that immediately follow it). This entire block is the feature to implement.
  - If no top-level bullets remain, report "Backlog empty — nothing to implement" and **stop**

- **Announce** — State clearly which feature is being implemented, including any sub-items

- **Plan the implementation** — Before writing code:
  - Read relevant existing source files to understand current architecture
  - Check `docs/architecture.md` for project structure context
  - Check `constants/theme.ts` for theme tokens — no inline colors or spacing
  - Check `types/index.ts` for existing type definitions
  - Identify which files need to be created or modified

- **Implement the feature** — Follow project conventions:
  - TypeScript strict mode
  - Named exports only (no default exports)
  - Use theme tokens from `constants/theme.ts`
  - Use `void` keyword for intentionally unhandled promises

- **Write tests immediately** — Do NOT defer testing:
  - Co-located test file next to source (`Foo.tsx` → `Foo.test.tsx`)
  - Snapshot tests for new React components (`Foo.snapshot.test.tsx`)
  - Follow mocking patterns from `jest.setup.ts`
  - Use `renderHook` for hooks, `render`/`screen`/`fireEvent` for components

- **Run full checks** — Run `npm run check` (typecheck + lint + test). If anything fails, diagnose and fix, then re-run until all pass.

- **Commit and push** — Stage all relevant files and commit with a descriptive message prefixed with `feat:`. Then `git push -u origin` the current branch.

- **Update backlog files**:
  - Remove the entire top-level bullet and its children from `docs/features-backlog.md`
  - Append the feature to `docs/features-completed.md` with a date stamp: `- Feature name (YYYY-MM-DD)`
    - If the feature had children, include them indented under it
  - Commit with message `docs: move "Feature name" from backlog to completed`
  - Push

- **Report** — Summarize what was done:
  - Feature implemented
  - Files created/modified
  - Tests added
  - Check results (all passing)

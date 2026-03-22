---
name: add-feature
description: Add a new feature to the backlog. Accepts a feature name and optional sub-items. Appends to the end by default, or inserts at a specific position.
disable-model-invocation: false
allowed-tools: Read, Edit, Bash
---

Add a feature to `docs/features-backlog.md`.

## Usage

`/add-feature <feature description>` — append to end of backlog
`/add-feature top <feature description>` — insert as the next feature to implement
`/add-feature after <existing feature> <feature description>` — insert after a specific item

## Steps

- Read `docs/features-backlog.md`
- Parse the user's input to determine:
  - The feature name (and any sub-items if the user provides a hierarchical description)
  - The position: end (default), top (first bullet), or after a named existing feature
- Add the feature as a hyphen-prefixed bullet (`- Feature name`)
  - If the user provided sub-items, add them as indented children (`  - Sub-item`)
  - Strictly no numbered lists — hyphens only
- Commit with message `docs: add "Feature name" to backlog`
- Push
- Report what was added and its position in the backlog

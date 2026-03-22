---
name: update-snapshots
description: Update Jest snapshots after intentional UI changes.
disable-model-invocation: false
allowed-tools: Bash
---

Update all Jest snapshots and verify the changes are intentional.

## Steps

1. Run `npx jest -u` to update all snapshots
2. Run `npx jest` to confirm all tests pass with new snapshots
3. Show the user which snapshot files changed by running `git diff --stat -- '**/__snapshots__/*'`

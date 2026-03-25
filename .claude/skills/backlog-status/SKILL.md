---
name: backlog-status
description: Show the current feature backlog status — remaining and completed features.
disable-model-invocation: false
allowed-tools: Read, Bash
---

Display the current state of the feature backlog.

## Steps

- Read `docs/features-backlog.md` and count remaining top-level features (lines matching `^- `)
- Read `docs/features-completed.md` and count completed features
- Report:
  - **Next up:** The top feature from the backlog (or "Backlog empty")
  - **Remaining:** Count of features left
  - **Completed:** Count of features done, with the list
  - **Progress:** X of Y total features implemented

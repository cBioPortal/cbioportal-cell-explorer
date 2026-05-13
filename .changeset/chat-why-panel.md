---
"@cbioportal-cell-explorer/highperformer": minor
---

Add a "Why" panel under each assistant turn in the chat. The panel
surfaces what the agent did — tool calls with their arguments and
duration, UI actions, errors, and final token usage. Collapsed by
default with a summary chip (`▼ Why · 2 tools · 3.2s`); auto-expands
when the turn has an error (`⚠ Why · 2 tools (1 error) · 3.2s`).

Internals: `ChatMessage` gained an optional `trace: TraceEntry[]` plus
`usage`, `startedAt`, `endedAt`. The reducer appends to the trace as
events arrive — `parts` still holds only the inline-rendered content.

Implements cell-explorer-py#96 v1; depends on the matching backend PR
that emits `args` on `tool_progress.started` and `duration_ms` on
`tool_progress.ok` / `error`. Backend lands first; frontend is
forward-compatible because the new fields are optional.

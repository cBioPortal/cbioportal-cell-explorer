---
"@cbioportal-cell-explorer/highperformer": minor
---

Chat client now sends a compact view-state snapshot with each turn request
(`view_state` field on `POST /api/chat/<slug>/turns`). Lets the backend
agent answer relative queries like "zoom in more" / "change to a different
gene" without a separate tool call.

Snapshot omits fields at their defaults; gene names resolve through
`geneLabelMap` so the agent sees symbols (CD8A) rather than var indices.
Filter / selection state is summarised (counts, not full ID lists).
Typical payload: 50–150 tokens.

Backend wiring follows in a cell-explorer-py PR — until then the field is
silently ignored by the existing chat endpoint.

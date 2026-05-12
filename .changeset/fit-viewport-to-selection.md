---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `fitViewportToSelection: boolean` to AppConfig. When true, applyConfig
computes the bounding box of the currently selected cells (from
`selectionFilterBuffer` × `embeddingData.positions`) and applies a viewport
that fits them. No-op when no selection is active.

Pairs with the upcoming `fit_viewport_to_selection` agent tool — the agent
doesn't have access to embedding coordinates, so it can't compute the bbox
itself; this lets the frontend do it.

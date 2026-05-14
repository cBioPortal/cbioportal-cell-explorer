---
"@cbioportal-cell-explorer/highperformer": minor
---

Decouple cluster-label rendering from color mode. Adds
`categoryLabelsObsColumn` to the AppConfig schema and store so callers
(postMessage, agent) can pick the obs column for cluster labels
independent of color mode (e.g. label by `leiden` while coloring by
gene expression). The ColorBySection toggle moves into its own
subsection visible in both color modes, with a column picker beside
it. The view-state snapshot now emits `showCategoryLabels` and
`categoryLabelsObsColumn` so the agent can read current label state.

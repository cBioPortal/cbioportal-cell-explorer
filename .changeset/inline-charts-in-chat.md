---
"@cbioportal-cell-explorer/highperformer": minor
---

Inline charts in chat. Tool results that include a `chart` hint (e.g.
`top_expressed_genes`, `gene_panel_by_obs`) now render a compact chart
directly beneath the matching tool pill in assistant bubbles. Clicking
the chart opens it at full size in the existing ChartModal with a
snapshot of the chart data plus a raw-data table tab. Unknown chart
types are silently ignored so the backend can introduce new chart
types without breaking older clients. Charts are live-only: they do
not persist across thread reloads.

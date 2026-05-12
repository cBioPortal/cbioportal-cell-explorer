---
"@cbioportal-cell-explorer/highperformer": minor
---

Add summary panel removal semantics to AppConfig. Pairs with the
upcoming `remove_summary_obs_column`, `remove_summary_gene`, and
`clear_summary` agent tools.

- New fields: `removeSummaryObsColumns: string[]?` and
  `removeSummaryGenes: string[]?` — call `removeSummaryObsColumn` /
  `removeSummaryGene` per name. Symbols resolve to var indices via
  `geneLabelMap`.
- `summaryObsColumns: null` and `summaryGenes: null` are reset
  sentinels: clear the entire pinned list. (`string[]` retains the
  existing additive semantics.)
- Unknown names in the remove arrays are a silent no-op (store filter
  doesn't match).

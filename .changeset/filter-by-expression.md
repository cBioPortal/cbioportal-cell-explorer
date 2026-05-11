---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `filterByExpression: { gene, min?, max? }` to AppConfig. Selects cells
whose `gene` expression falls within `[min, max]` (null bounds mean ±∞).
Implemented as a new `ExpressionSelectionGroup` variant alongside the
existing spatial / custom groups; participates in the same
`selectionFilterBuffer` machinery (no new color buffer rebuild, no new
deck.gl re-render paths).

Cross-field rules in `applyConfig`:
- At least one of `min` / `max` must be set
- `min <= max` when both are set
- `gene` accepts either a var index or a symbol (resolved via
  `geneLabelMap`, same as `gene` / `summaryGenes`)
- Defaults `summaryContext` to `'selections'` unless the caller specified
  otherwise (parallels `filter`)

`SelectionToolbar` renders an expression-filter chip (e.g. `"CD8A ≥ 2"`)
that can be dismissed to clear the filter. Display mode is forced to
`'hide'` on apply (same convention as ID-based filter).

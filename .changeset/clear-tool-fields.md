---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `null` as a reset sentinel for `colorBy` / `gene` / `category` /
`pointSize` / `opacity` in AppConfig. Pairs with the upcoming
`clear_color_by` and `clear_render_controls` agent tools.

- `colorBy: null` → clears both color paths (calls `clearGene` +
  `clearObsColumn`); falls back to the default gray rendering.
- `pointSize: null` / `opacity: null` → resets to the store defaults
  (0.5 / 0.5).
- `gene: null` / `category: null` accepted by the schema for symmetry
  but currently no-op on their own (use `colorBy: null` to clear).

`clear_viewport` deferred — `set_viewport` itself only takes effect at
the next deck.gl mount (initialViewState is consumed once); a proper
runtime viewport reset needs a separate frontend refactor.

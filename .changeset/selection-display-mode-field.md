---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `selectionDisplayMode: 'dim' | 'hide'` to AppConfig. Mirrors the
SelectionToolbar dim/hide toggle. Applied AFTER filter phases so an
explicit value overrides the `'hide'` default that `selectByIds` /
`selectByExpression` set internally — letting URL configs (and the
upcoming `set_selection_display_mode` agent tool) request "filter but
keep context visible" in a single payload.

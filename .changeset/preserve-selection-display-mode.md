---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix: ID-based selection (`selectByIds` / `commitCustomGroupToggle`) no longer
forces `selectionDisplayMode = 'hide'`. The current mode is preserved (default
`'dim'`), so a follow-up "color by gene/category" recolors the full canvas
with the selection highlighted instead of culling non-selected points. Users
can still toggle to 'hide' via the SelectionToolbar.

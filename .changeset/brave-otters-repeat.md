---
"@cbioportal-cell-explorer/highperformer": patch
---

Stop a focus ring appearing when a facet filter is clicked.

The facet value rule used `:focus-within`, which matches mouse input too, so
ticking a filter drew an outline around the whole row until focus moved
elsewhere. It now uses `:has(:focus-visible)`, so the ring appears for keyboard
navigation only.

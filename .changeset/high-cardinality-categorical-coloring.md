---
"@cbioportal-cell-explorer/highperformer": minor
---

Improve coloring by high-cardinality obs categories. Expand the categorical palette to 24 colors, fix a silent code-wrap that merged categories past 256 (codes are now Uint16, ceiling 65,535), and replace the hard 1000-value block with tiered behavior: color with a recycled palette (and an informational "colors repeat" note) up to 65,535 distinct values, block above that. The on-plot legend collapses to a compact summary above 500 categories instead of rendering every row.

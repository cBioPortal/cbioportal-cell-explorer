---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `highlightedCategories: string[]` to AppConfig. Specifies a subset of the
active category column's values that should render at full opacity while
the rest fade to gray — the same effect produced by clicking swatches in the
categorical legend, now expressible via URL config / applyConfig payloads.

Requires `colorBy='category'` + `category` set in the same payload. Labels
are matched against the loaded `categoryMap`; unknown labels yield a
`field_value_invalid` error.

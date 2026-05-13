---
"@cbioportal-cell-explorer/highperformer": minor
---

Add cluster label overlay to the deck.gl scatterplot. A new "Show cluster
labels" toggle in the color-by panel renders category names (e.g. cell
types) at category centroids while in category color mode. The label
overlay is highlight-aware — when a subset of categories is highlighted
from the legend, only those labels render. Centroids are computed once
per (embedding, obs column) in a worker and cached. Closes #189.

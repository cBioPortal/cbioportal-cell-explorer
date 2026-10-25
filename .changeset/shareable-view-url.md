---
"@cbioportal-cell-explorer/highperformer": minor
---

The view URL now follows what you're looking at, so it can be copied and shared. The embedding, gene or obs-column coloring and color scale show up as readable query params (`?dataset=lung&embedding=X_umap&gene=EGFR&colorScale=magma`), are applied on top of the dataset's default view when the link is opened, and update in place without adding browser history entries. The dataset link menu gains "Copy link to this view".

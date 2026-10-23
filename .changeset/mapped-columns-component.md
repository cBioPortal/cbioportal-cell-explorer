---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/component": minor
---

Hosts can pass `mappedColumns` in the config to color cells by data that only lives in the host, such as cBioPortal clinical attributes. Each column maps values of an obs column (e.g. `donor_id`) to a category, and shows up in the color-by list like a native column. Adds `@cbioportal-cell-explorer/component`, a `<CellExplorer>` React component wrapping the viewer for embedding in cbioportal-frontend.

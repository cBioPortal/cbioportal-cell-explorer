---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": patch
---

Apply a dataset's stored default view on load. When a catalog dataset has a curator-set `default_view` (coloring, cluster labels, point rendering) and no explicit `?config=` link is present, highperformer now applies it via `applyConfig()`. The generated API client exposes the new `default_view` field on `DatasetResponse`.

---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `showCategoryLabels: boolean` to the AppConfig schema. Wires the
cluster-label overlay toggle into the embeddable/postMessage config
surface so callers (including the future agent tool) can flip it
remotely. Applied in Phase 1 alongside the other UI toggles — does
not block on dataset metadata.

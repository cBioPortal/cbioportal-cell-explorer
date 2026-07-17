---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix intermittent failure applying a dataset's stored default view. `applyConfig` now treats a dataset as still-loading when its handle is open (`adata`) but obs columns haven't arrived yet — the async window after `openDataset` resolves but before `fetchEmbedding`'s background obs-columns fetch completes — so it waits for metadata instead of bailing with `metadata_unavailable`.

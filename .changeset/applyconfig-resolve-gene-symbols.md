---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix: `applyConfig` now accepts gene symbols (e.g. 'DAPL1') in addition to raw
var indices (e.g. 'ENSG00000176566') for both `gene` and `summaryGenes`. When a
gene label column is auto-detected, the resolved `geneLabelMap` is consulted to
translate the symbol to the canonical var index before calling `selectGene` /
`addSummaryGene` — matching what the sidebar UI already does internally and what
the agent tool catalog emits.

Previously, agent tool calls like `set_color_by_gene(gene='DAPL1')` against a
Spectrum-style dataset failed `applyConfig` with `field_value_invalid` because
`varNames` contains Ensembl IDs, not symbols.

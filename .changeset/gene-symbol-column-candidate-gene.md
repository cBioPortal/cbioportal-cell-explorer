---
"@cbioportal-cell-explorer/zarrstore": patch
---

Recognize `gene` as a gene-symbol column candidate. Datasets like
egfr_all_cells.zarr store symbols in a column literally named `gene` rather
than the common `feature_name` / `gene_symbol` conventions. Added at the
end of the priority list so canonical columns still win when both exist.
Mirrors the matching backend change.

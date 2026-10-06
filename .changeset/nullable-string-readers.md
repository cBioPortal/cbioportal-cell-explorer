---
"@cbioportal-cell-explorer/zarrstore": minor
"@cbioportal-cell-explorer/highperformer": patch
---

Read stores written with pandas 3 and anndata 0.13, which store string columns and obs/var indexes as `nullable-string-array` (a `values` + `mask` group). Missing values in nullable integer and boolean columns are now returned as `null`.

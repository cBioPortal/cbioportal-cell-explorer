---
"@cbioportal-cell-explorer/zarrstore": minor
"@cbioportal-cell-explorer/highperformer": patch
---

Read stores written with pandas 3 and anndata 0.13, which store string columns and obs/var indexes as `nullable-string-array` (a `values` + `mask` group). Missing values in nullable integer, boolean and string columns are returned as `null`, and missing obs/var index entries stay `null` instead of becoming the string "null". Plain-array columns now open without an extra group probe, and index read errors are no longer reported as "not found".

---
"@cbioportal-cell-explorer/zarrstore": minor
---

Add `StrataStore`, a companion to `AnnDataStore` that reads per-stratum
aggregate tables (`uns/strata/coarse_*` and `uns/strata/atomic`) written by
`cell2zarr build-strata`. Discovery methods are synchronous (from
consolidated metadata); reads are promise-cached and abort-aware and emit
`czl:strata:*` profile measures. Standalone helpers `findCoarseByAxes` and
`findCoarseCovering` are exported alongside the class. Pure-function
helpers `strataMeans`, `strataFracExpressing`, `strataVariances`, and
`dotplotData` derive quantities from a loaded `StrataTable`. AnnDataStore
is unchanged.

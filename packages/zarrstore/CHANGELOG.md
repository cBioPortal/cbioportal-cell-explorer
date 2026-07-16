# @cbioportal-cell-explorer/zarrstore

## 0.3.1

### Patch Changes

- [#285](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/285) [`5c1e8a8`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/5c1e8a8ec5e97cab7c72d7337d16421f42d7b17f) Thanks [@hweej](https://github.com/hweej)! - Recognize `gene` as a gene-symbol column candidate. Datasets like
  egfr_all_cells.zarr store symbols in a column literally named `gene` rather
  than the common `feature_name` / `gene_symbol` conventions. Added at the
  end of the priority list so canonical columns still win when both exist.
  Mirrors the matching backend change.

## 0.3.0

### Minor Changes

- [#276](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/276) [`61fde5f`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/61fde5fa82857df655649e0b817558a6f6ab03b7) Thanks [@hweej](https://github.com/hweej)! - Add `StrataStore`, a companion to `AnnDataStore` that reads per-stratum
  aggregate tables (`uns/strata/coarse_*` and `uns/strata/atomic`) written by
  `cell2zarr build-strata`. Discovery methods are synchronous (from
  consolidated metadata); reads are promise-cached and abort-aware and emit
  `czl:strata:*` profile measures. Standalone helpers `findCoarseByAxes` and
  `findCoarseCovering` are exported alongside the class. Pure-function
  helpers `strataMeans`, `strataFracExpressing`, `strataVariances`, and
  `dotplotData` derive quantities from a loaded `StrataTable`. AnnDataStore
  is unchanged.

## 0.2.0

### Minor Changes

- [#223](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/223) [`3b6a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3b6a076ade457f6cea378fc546eb9f9fa98924f0) Thanks [@hweej](https://github.com/hweej)! - Add dataset catalog integration with credential minting for private zarr stores. ZarrStore.open() and AnnDataStore.open() accept optional overrides for auth headers. Home page shows tabbed Catalog/My URLs with status probing. UserAvatar component with popover sign-out. Support ?dataset=slug URL param and config serialization.

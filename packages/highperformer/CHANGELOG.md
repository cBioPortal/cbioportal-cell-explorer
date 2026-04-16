# @cbioportal-cell-explorer/highperformer

## 0.3.0

### Minor Changes

- [#223](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/223) [`3b6a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3b6a076ade457f6cea378fc546eb9f9fa98924f0) Thanks [@hweej](https://github.com/hweej)! - Add dataset catalog integration with credential minting for private zarr stores. ZarrStore.open() and AnnDataStore.open() accept optional overrides for auth headers. Home page shows tabbed Catalog/My URLs with status probing. UserAvatar component with popover sign-out. Support ?dataset=slug URL param and config serialization.

- [#221](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/221) [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc) Thanks [@hweej](https://github.com/hweej)! - Add Keycloak auth support: typed API client with openapi-fetch, auth state in store, sign in/out UI in sidebar

### Patch Changes

- Updated dependencies [[`3b6a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3b6a076ade457f6cea378fc546eb9f9fa98924f0), [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc)]:
  - @cbioportal-cell-explorer/zarrstore@0.2.0
  - @cbioportal-cell-explorer/api-client@0.1.0

## 0.2.1

### Patch Changes

- [#215](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/215) [`8e8bfb2`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/8e8bfb2a654ccb4cca770c6f2b2bacebb2989f66) Thanks [@hweej](https://github.com/hweej)! - Add backend detection via /api/info probe and display version info in branding header popover

- [#199](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/199) [`be630ec`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/be630ec34edd4ac32f03896819cf0c8cbf3db781) Thanks [@hweej](https://github.com/hweej)! - Show custom group IDs in the venn diagram click popover with a truncated list (first 20) and a "Manage IDs" link to open the full modal

## 0.2.0

### Minor Changes

- [#196](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/196) [`a4c2de0`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a4c2de0e602c64021c14f8293e14a292f5a94dab) Thanks [@hweej](https://github.com/hweej)! - Add embedded mode support with config query param and postMessage transport

  - `?config={...}` query parameter for setting initial view state (dataset, embedding, color mapping, custom group filter, summary panel, UI toggles)
  - PostMessage listener for runtime config updates from a parent iframe (gated by `VITE_ENABLE_POSTMESSAGE` and `VITE_POSTMESSAGE_ORIGIN` env vars)
  - First message applies full config; subsequent same-URL messages update filter only (optimized for cBioPortal patient/sample ID list changes)
  - Shareable link popover with "Share dataset" and "Share current view" options
  - Dataset load error screen with retry support
  - UI visibility toggles: `showHeader`, `showLeftSidebar`, `showRightSidebar`, `showDatasetDropdown`

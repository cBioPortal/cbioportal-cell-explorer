# @cbioportal-cell-explorer/highperformer

## 0.2.0

### Minor Changes

- [#196](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/196) [`a4c2de0`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a4c2de0e602c64021c14f8293e14a292f5a94dab) Thanks [@hweej](https://github.com/hweej)! - Add embedded mode support with config query param and postMessage transport

  - `?config={...}` query parameter for setting initial view state (dataset, embedding, color mapping, custom group filter, summary panel, UI toggles)
  - PostMessage listener for runtime config updates from a parent iframe (gated by `VITE_ENABLE_POSTMESSAGE` and `VITE_POSTMESSAGE_ORIGIN` env vars)
  - First message applies full config; subsequent same-URL messages update filter only (optimized for cBioPortal patient/sample ID list changes)
  - Shareable link popover with "Share dataset" and "Share current view" options
  - Dataset load error screen with retry support
  - UI visibility toggles: `showHeader`, `showLeftSidebar`, `showRightSidebar`, `showDatasetDropdown`

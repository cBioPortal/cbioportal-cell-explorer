# @cbioportal-cell-explorer/api-client

## 0.1.0

### Minor Changes

- [#238](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/238) [`75e7b30`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/75e7b306da65806e65b18ec5de24091d87d84aa8) Thanks [@hweej](https://github.com/hweej)! - Add chat panel to the right sidebar. Wraps the existing Summary panel in antd Tabs so users can switch between `Summary` and `Chat`. The chat panel streams answers from the new `/api/chat/{slug}` backend (cell-explorer-py PR [#64](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/64)), renders markdown including GFM tables, supports stop / retry / auto-scroll, and dispatches agent `ui_action` events into `applyConfig` so the agent can update the view (color, embedding, etc.). The Chat tab is hidden unless the backend reports `chat_enabled: true` (set when `ANTHROPIC_API_KEY` is configured).

- [#221](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/221) [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc) Thanks [@hweej](https://github.com/hweej)! - Add Keycloak auth support: typed API client with openapi-fetch, auth state in store, sign in/out UI in sidebar

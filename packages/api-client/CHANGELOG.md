# @cbioportal-cell-explorer/api-client

## 0.2.3

### Patch Changes

- [#304](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/304) [`d2a4dac`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/d2a4dac3742f9fe8d5c20bda442e619d57eff7fc) Thanks [@hweej](https://github.com/hweej)! - Filter the catalogue by real facet values.

  The backend now ships `ObsColumnInfo[]` on `DatasetMetadataResponse`, with each
  column carrying a canonical `facet` key, so the sidebar runs on harvested values
  instead of the development fixture. `VITE_MOCK_FACETS` and `mockFacets.ts` are
  removed.

  Three judgements the frontend applies on top of the backend's designation:

  - Where several columns claim one facet, the column named like the facet wins.
    `cell_type` arrives from both `cell_type` (ontology labels) and
    `author_cell_type` (author shorthand); unioned they made 157 values of mixed
    vocabulary, and `disease` picked up `condition`'s "TST" and "fresh".
  - Facets whose catalogue-wide vocabulary exceeds 100 values are dropped, which
    excludes `donor` at 276 — identifiers, not filters.
  - `development_stage` is excluded by name. At 90 values of "1-month-old stage" /
    "10-year-old stage" it passes the ceiling but is a continuous axis expressed
    as strings, unusable as a checklist.

- [#304](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/304) [`ef91f05`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/ef91f0582143de5a6b6934a604da2e3e7e552a0f) Thanks [@hweej](https://github.com/hweej)! - Regenerate types against the current API spec, which now carries harvested store
  metadata (`n_obs`, `n_vars`, embedding keys) on the dataset responses.

## 0.2.2

### Patch Changes

- [#296](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/296) [`451f4c0`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/451f4c02e5b42d14ae7658e483b8eaa3b93d8fa3) Thanks [@hweej](https://github.com/hweej)! - Group datasets by collection in the catalog.

  The catalog now opens on a Collections tab listing studies rather than a flat
  list of every dataset, with `/collections/:slug` giving each study its own page
  showing its description, publication link, and datasets. Datasets belonging to
  no collection remain reachable under an "Ungrouped" heading, and the previous
  flat list is still available under "All datasets".

  The dataset list moved out of `Home` into a reusable `DatasetList` component so
  the collection page and the catalog share one implementation of store probing
  and access resolution.

  `api-client` is regenerated against the backend's collection endpoints.

## 0.2.1

### Patch Changes

- [#287](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/287) [`a80a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a80a076d62a2400b82cc8d49cee67fd16237c19e) Thanks [@hweej](https://github.com/hweej)! - Apply a dataset's stored default view on load. When a catalog dataset has a curator-set `default_view` (coloring, cluster labels, point rendering) and no explicit `?config=` link is present, highperformer now applies it via `applyConfig()`. The generated API client exposes the new `default_view` field on `DatasetResponse`.

## 0.2.0

### Minor Changes

- [#255](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/255) [`f691ec8`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f691ec811223156f8e9aad4a27f9ef3ea737bc99) Thanks [@hweej](https://github.com/hweej)! - Wire the chat-panel UI to the new per-dataset and per-user chat gates from
  cell-explorer-py. The chat tab on the View page is now hidden when
  `dataset.chat_enabled` is false. When the tab is visible but the user's
  `permission.can_chat` is false, ChatPanel renders a `ChatPermissionBanner`
  (sign-in CTA for anonymous, contact-admin copy for missing role) instead of
  the chat input. The api-client is regenerated to expose `chat_enabled` on
  the dataset shapes and a `permission` field on `ContextResponse`.

- [#256](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/256) [`1b54449`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/1b54449ccbd34e84c43aa388089f7043a7f547c6) Thanks [@hweej](https://github.com/hweej)! - Add chat thread persistence and history. The chat tab now opens to a list of
  past conversations on the current dataset. Click a thread to resume it (history
  hydrates into the reducer); click "+ New chat" to start a fresh one (auto-titled
  from the first user message after the stream's `thread_open` event). Hover a
  row to reveal a delete button, confirmed via `Modal.confirm` and persisted via
  `DELETE /api/chat/{slug}/threads/{id}`. ChatPanel becomes a mode-based router
  (list / new / active), with the conversation render extracted into a dedicated
  `ConversationView` component. `useChatTurn`'s `start()` and `chat.streamTurn()`
  gain a `threadId` parameter the route uses to attribute messages.

## 0.1.0

### Minor Changes

- [#238](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/238) [`75e7b30`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/75e7b306da65806e65b18ec5de24091d87d84aa8) Thanks [@hweej](https://github.com/hweej)! - Add chat panel to the right sidebar. Wraps the existing Summary panel in antd Tabs so users can switch between `Summary` and `Chat`. The chat panel streams answers from the new `/api/chat/{slug}` backend (cell-explorer-py PR [#64](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/64)), renders markdown including GFM tables, supports stop / retry / auto-scroll, and dispatches agent `ui_action` events into `applyConfig` so the agent can update the view (color, embedding, etc.). The Chat tab is hidden unless the backend reports `chat_enabled: true` (set when `ANTHROPIC_API_KEY` is configured).

- [#221](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/221) [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc) Thanks [@hweej](https://github.com/hweej)! - Add Keycloak auth support: typed API client with openapi-fetch, auth state in store, sign in/out UI in sidebar

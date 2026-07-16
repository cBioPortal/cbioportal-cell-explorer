# @cbioportal-cell-explorer/api-client

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

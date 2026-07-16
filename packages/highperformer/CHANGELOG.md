# @cbioportal-cell-explorer/highperformer

## 0.5.0

### Minor Changes

- [#287](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/287) [`a80a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a80a076d62a2400b82cc8d49cee67fd16237c19e) Thanks [@hweej](https://github.com/hweej)! - Apply a dataset's stored default view on load. When a catalog dataset has a curator-set `default_view` (coloring, cluster labels, point rendering) and no explicit `?config=` link is present, highperformer now applies it via `applyConfig()`. The generated API client exposes the new `default_view` field on `DatasetResponse`.

### Patch Changes

- Updated dependencies [[`a80a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a80a076d62a2400b82cc8d49cee67fd16237c19e), [`5c1e8a8`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/5c1e8a8ec5e97cab7c72d7337d16421f42d7b17f)]:
  - @cbioportal-cell-explorer/api-client@0.2.1
  - @cbioportal-cell-explorer/zarrstore@0.3.1

## 0.4.0

### Minor Changes

- [#264](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/264) [`1fb6a2d`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/1fb6a2d2736382e353d89b409b27bdfbc30e9c7c) Thanks [@hweej](https://github.com/hweej)! - Add cluster label overlay to the deck.gl scatterplot. A new "Show cluster
  labels" toggle in the color-by panel renders category names (e.g. cell
  types) at category centroids while in category color mode. The label
  overlay is highlight-aware — when a subset of categories is highlighted
  from the legend, only those labels render. Centroids are computed once
  per (embedding, obs column) in a worker and cached. Closes [#189](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/189).

- [#268](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/268) [`cdc0e97`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/cdc0e9776582a4e4f13abadf80f10b601d7afbea) Thanks [@hweej](https://github.com/hweej)! - Render citation markers in assistant chat turns as clickable
  superscript links. The agent (cell-explorer-py#107) emits `[t:N]`
  markers where N is the 1-based ordinal of the tool call within the
  current turn; the frontend resolves each ordinal to the Nth
  `tool_start` entry in the trace and renders a numbered link.
  Clicking opens the WhyPanel (if collapsed) and flashes the matching
  tool row so users can see where a fact came from.

  Ordinals are used instead of raw `tool_use_id`s because models can't
  reliably reproduce 25-character random strings during free-form
  generation. Single-digit ordinals are within their working memory and
  the frontend's position-based lookup is deterministic — citations
  that appear always point to a real tool row. Out-of-range ordinals
  (if the model hallucinates one) render as inert grey labels.

- [#272](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/272) [`fcfe419`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/fcfe419de7a488d406ab3a6c116722d89c956056) Thanks [@hweej](https://github.com/hweej)! - Per-turn thumbs up/down on assistant chat messages. The strip lives
  next to the existing WhyPanel chip on each assistant bubble. Thumbs-up
  fires immediately with no follow-up; thumbs-down reveals an inline
  optional comment textarea. State is toggleable (click an active thumb
  to clear) and persists server-side via the new cell-explorer-py
  PUT/DELETE feedback endpoints. Reloading a thread shows each assistant
  message with the user's previous rating already applied.

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

- [#267](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/267) [`93ffe89`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/93ffe89b5e72ac6aeb114028c2639fbe662f476e) Thanks [@hweej](https://github.com/hweej)! - Add a "Why" panel under each assistant turn in the chat. The panel
  surfaces what the agent did — tool calls with their arguments and
  duration, UI actions, errors, and final token usage. Collapsed by
  default with a summary chip (`▼ Why · 2 tools · 3.2s`); auto-expands
  when the turn has an error (`⚠ Why · 2 tools (1 error) · 3.2s`).

  Internals: `ChatMessage` gained an optional `trace: TraceEntry[]` plus
  `usage`, `startedAt`, `endedAt`. The reducer appends to the trace as
  events arrive — `parts` still holds only the inline-rendered content.

  Implements cell-explorer-py#96 v1; depends on the matching backend PR
  that emits `args` on `tool_progress.started` and `duration_ms` on
  `tool_progress.ok` / `error`. Backend lands first; frontend is
  forward-compatible because the new fields are optional.

- [#246](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/246) [`9c4a005`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/9c4a0052f388788f4de1f1b8cab5de695e3118de) Thanks [@hweej](https://github.com/hweej)! - Add `null` as a reset sentinel for `colorBy` / `gene` / `category` /
  `pointSize` / `opacity` in AppConfig. Pairs with the upcoming
  `clear_color_by` and `clear_render_controls` agent tools.

  - `colorBy: null` → clears both color paths (calls `clearGene` +
    `clearObsColumn`); falls back to the default gray rendering.
  - `pointSize: null` / `opacity: null` → resets to the store defaults
    (0.5 / 0.5).
  - `gene: null` / `category: null` accepted by the schema for symmetry
    but currently no-op on their own (use `colorBy: null` to clear).

  `clear_viewport` deferred — `set_viewport` itself only takes effect at
  the next deck.gl mount (initialViewState is consumed once); a proper
  runtime viewport reset needs a separate frontend refactor.

- [#269](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/269) [`6f702d4`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/6f702d42e7bc89f6bae439e63b039689e2c4bc45) Thanks [@hweej](https://github.com/hweej)! - Decouple cluster-label rendering from color mode. Adds
  `categoryLabelsObsColumn` to the AppConfig schema and store so callers
  (postMessage, agent) can pick the obs column for cluster labels
  independent of color mode (e.g. label by `leiden` while coloring by
  gene expression). The ColorBySection toggle moves into its own
  subsection visible in both color modes, with a column picker beside
  it. The view-state snapshot now emits `showCategoryLabels` and
  `categoryLabelsObsColumn` so the agent can read current label state.

- [#251](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/251) [`b1addc2`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/b1addc2e88126a15b8379099d76dea9a15abeafc) Thanks [@hweej](https://github.com/hweej)! - Add `colorScaleName: 'viridis' | 'magma' | 'plasma' | 'inferno'` to AppConfig.
  Pairs with the upcoming `set_color_scale` agent tool. The enum matches the
  four scales already supported by `COLOR_SCALES` in the color buffer worker;
  applyConfig calls the existing `setColorScaleName` store action (rebuilds
  the color buffer only if currently in gene mode).

- [#244](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/244) [`baed4e7`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/baed4e7b9fa5f15950ba0e1553118c8df426214a) Thanks [@hweej](https://github.com/hweej)! - Add `filterByExpression: { gene, min?, max? }` to AppConfig. Selects cells
  whose `gene` expression falls within `[min, max]` (null bounds mean ±∞).
  Implemented as a new `ExpressionSelectionGroup` variant alongside the
  existing spatial / custom groups; participates in the same
  `selectionFilterBuffer` machinery (no new color buffer rebuild, no new
  deck.gl re-render paths).

  Cross-field rules in `applyConfig`:

  - At least one of `min` / `max` must be set
  - `min <= max` when both are set
  - `gene` accepts either a var index or a symbol (resolved via
    `geneLabelMap`, same as `gene` / `summaryGenes`)
  - Defaults `summaryContext` to `'selections'` unless the caller specified
    otherwise (parallels `filter`)

  `SelectionToolbar` renders an expression-filter chip (e.g. `"CD8A ≥ 2"`)
  that can be dismissed to clear the filter. Display mode is forced to
  `'hide'` on apply (same convention as ID-based filter).

- [#250](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/250) [`114b8ce`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/114b8ce1f41c9bdbd0350b906dbaeb55d1deb418) Thanks [@hweej](https://github.com/hweej)! - Add `fitViewportToSelection: boolean` to AppConfig. When true, applyConfig
  computes the bounding box of the currently selected cells (from
  `selectionFilterBuffer` × `embeddingData.positions`) and applies a viewport
  that fits them. No-op when no selection is active.

  Pairs with the upcoming `fit_viewport_to_selection` agent tool — the agent
  doesn't have access to embedding coordinates, so it can't compute the bbox
  itself; this lets the frontend do it.

- [#242](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/242) [`ec215db`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/ec215dbba78e4b6431dc96eb546c08a2f298b67c) Thanks [@hweej](https://github.com/hweej)! - Add `highlightedCategories: string[]` to AppConfig. Specifies a subset of the
  active category column's values that should render at full opacity while
  the rest fade to gray — the same effect produced by clicking swatches in the
  categorical legend, now expressible via URL config / applyConfig payloads.

  Requires `colorBy='category'` + `category` set in the same payload. Labels
  are matched against the loaded `categoryMap`; unknown labels yield a
  `field_value_invalid` error.

- [#281](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/281) [`9f488e2`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/9f488e25843b32b1b770cee5f09b22a4a711e271) Thanks [@hweej](https://github.com/hweej)! - Inline charts in chat. Tool results that include a `chart` hint (e.g.
  `top_expressed_genes`, `gene_panel_by_obs`) now render a compact chart
  directly beneath the matching tool pill in assistant bubbles. Clicking
  the chart opens it at full size in the existing ChartModal with a
  snapshot of the chart data plus a raw-data table tab. Unknown chart
  types are silently ignored so the backend can introduce new chart
  types without breaking older clients. Charts are live-only: they do
  not persist across thread reloads.

- [#263](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/263) [`c3ec729`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/c3ec72996b8783a94b841cfd7aaeeb389174556e) Thanks [@hweej](https://github.com/hweej)! - Right sidebar: default width bumped from 300 → 400; added 700 and 800
  as wider drag-snap points. Full snap list is now `[60, 300, 400, 550,
700, 800]`. The chat panel benefits most from the extra width.

- [#245](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/245) [`31e4055`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/31e40558a93c0257272fb862a9183ae464a12a36) Thanks [@hweej](https://github.com/hweej)! - Add `selectionDisplayMode: 'dim' | 'hide'` to AppConfig. Mirrors the
  SelectionToolbar dim/hide toggle. Applied AFTER filter phases so an
  explicit value overrides the `'hide'` default that `selectByIds` /
  `selectByExpression` set internally — letting URL configs (and the
  upcoming `set_selection_display_mode` agent tool) request "filter but
  keep context visible" in a single payload.

- [#265](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/265) [`37937f1`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/37937f11dc7a87781a623bf646a4b3471b5bba84) Thanks [@hweej](https://github.com/hweej)! - Add `showCategoryLabels: boolean` to the AppConfig schema. Wires the
  cluster-label overlay toggle into the embeddable/postMessage config
  surface so callers (including the future agent tool) can flip it
  remotely. Applied in Phase 1 alongside the other UI toggles — does
  not block on dataset metadata.

- [#247](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/247) [`096db94`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/096db9415806c0245caef801229856dbc924d344) Thanks [@hweej](https://github.com/hweej)! - Add summary panel removal semantics to AppConfig. Pairs with the
  upcoming `remove_summary_obs_column`, `remove_summary_gene`, and
  `clear_summary` agent tools.

  - New fields: `removeSummaryObsColumns: string[]?` and
    `removeSummaryGenes: string[]?` — call `removeSummaryObsColumn` /
    `removeSummaryGene` per name. Symbols resolve to var indices via
    `geneLabelMap`.
  - `summaryObsColumns: null` and `summaryGenes: null` are reset
    sentinels: clear the entire pinned list. (`string[]` retains the
    existing additive semantics.)
  - Unknown names in the remove arrays are a silent no-op (store filter
    doesn't match).

- [#239](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/239) [`6382d57`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/6382d572414eca2a11168ac182ad5f9bc6d9eaee) Thanks [@hweej](https://github.com/hweej)! - Refactors AppConfig contract: applyConfig returns typed ApplyResult,
  schema gains viewport / pointSize / opacity / summaryContext fields,
  implicit side effects become explicit defaults, errors surface as
  visible chat / loading / postMessage events instead of silent console
  warnings. Also adds `pnpm schema` script that emits
  `schema/app-config.schema.json` for cell-explorer-py codegen.

- [#252](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/252) [`f17f981`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f17f981f3affb6cb500c8e17e4012253b8759d23) Thanks [@hweej](https://github.com/hweej)! - Chat client now sends a compact view-state snapshot with each turn request
  (`view_state` field on `POST /api/chat/<slug>/turns`). Lets the backend
  agent answer relative queries like "zoom in more" / "change to a different
  gene" without a separate tool call.

  Snapshot omits fields at their defaults; gene names resolve through
  `geneLabelMap` so the agent sees symbols (CD8A) rather than var indices.
  Filter / selection state is summarised (counts, not full ID lists).
  Typical payload: 50–150 tokens.

  Backend wiring follows in a cell-explorer-py PR — until then the field is
  silently ignored by the existing chat endpoint.

- [#249](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/249) [`3f4bc62`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3f4bc6237579dac80c9805aa6a3113c688051872) Thanks [@hweej](https://github.com/hweej)! - Fix `set_viewport` to actually take effect at runtime. Previously deck.gl
  ignored `initialViewState` changes after the initial mount, so
  programmatic viewport overrides only applied on the next embedding switch.

  The fix uses deck.gl's prescribed pattern per the perf rule: a
  `viewportEpoch` counter signals View.tsx, which imperatively calls
  `deckRef.current.deck.setProps({ viewState })` on the underlying Deck
  instance. An `onViewStateChange` ref handler keeps deck.gl in sync on
  subsequent pan/zoom. No React state for viewState — no per-frame
  re-render cost.

  Also adds `viewport: null` as a reset-to-fit-to-view sentinel. Pairs with
  the upcoming `clear_viewport` agent tool in cell-explorer-py.

### Patch Changes

- [#270](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/270) [`8de7b57`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/8de7b57346baa7765294366128d899dfa0bd5612) Thanks [@hweej](https://github.com/hweej)! - Fix: `applyConfig` now loads the label column's obs data via
  `addSummaryObsColumn` when `categoryLabelsObsColumn` is set to a
  non-null string. Previously the Phase 1 spread set the field via
  `setState`, bypassing the store setter's side effect, so labels
  dispatched through `applyConfig` (e.g. the chat agent calling
  `set_category_labels(value=True, obs_column="leiden")`) silently
  failed to render because `summaryObsData.get(labelColumn)` was
  undefined. Adds a `field_value_invalid` error path when the column
  is missing from `obsColumnNames`.

- [#273](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/273) [`924dbfe`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/924dbfedb876518b9ff0f21cddf9587d09e32200) Thanks [@hweej](https://github.com/hweej)! - Fix `applyConfig` silently no-op'ing on filter-clear payloads. The chat
  agent's `clear_filter` tool emits `{filter: {obsColumn: "_none", ids: []}}`,
  but the prior guard required `ids.length > 0` so the payload was
  ignored — the agent would say "filter cleared!" while the filter
  stayed active. Empty `ids` now dispatches `clearCustomGroup`.

- [#243](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/243) [`efe330a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/efe330a8131b31c015c246e384fb9c860f8ad4f6) Thanks [@hweej](https://github.com/hweej)! - Fix: `applyConfig` now accepts gene symbols (e.g. 'DAPL1') in addition to raw
  var indices (e.g. 'ENSG00000176566') for both `gene` and `summaryGenes`. When a
  gene label column is auto-detected, the resolved `geneLabelMap` is consulted to
  translate the symbol to the canonical var index before calling `selectGene` /
  `addSummaryGene` — matching what the sidebar UI already does internally and what
  the agent tool catalog emits.

  Previously, agent tool calls like `set_color_by_gene(gene='DAPL1')` against a
  Spectrum-style dataset failed `applyConfig` with `field_value_invalid` because
  `varNames` contains Ensembl IDs, not symbols.

- [#279](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/279) [`1671fa9`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/1671fa965cba8ca83d4513ff34aa13fbc7ef891a) Thanks [@hweej](https://github.com/hweej)! - Chat cancellation and streaming UX polish:

  - Replaces the browser-raw `"BodyStreamBuffer was aborted"` /
    `"signal is aborted without reason"` text with a friendly
    `"Cancelled"` message when the user clicks Stop. `useChatTurn`
    swallows AbortErrors it initiated itself and emits an `error`
    event with the clean message via `onEvent` instead of bubbling.
  - In-flight tool pills (`status: "started"`) are now moved to a
    terminal `"error"` state when the turn errors or cancels, so the
    pill stops spinning forever.
  - Adds a "Thinking…" indicator (small Spin + label) under the user's
    message while streaming, until the first text/tool arrives.
  - Adds a subtle pulse animation on in-flight tool pills so they
    read as actively working alongside the higher-level indicator.
  - Hardens the wire-message builder with `ensureAlternation` so
    hydrated threads whose last persisted message is a user role
    (possible if an older assistant turn errored before persisting)
    don't immediately 422 on the next submit. Inserts a synthetic
    `(interrupted)` assistant in the wire payload only — does not
    mutate stored history.

- [#259](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/259) [`70c89a3`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/70c89a3024fd6fa77d934a69a0623d41ded94479) Thanks [@hweej](https://github.com/hweej)! - Auto-submit suggestion chips in the chat empty state. Clicking a chip now
  sends the suggested prompt directly instead of populating the input field.
  Chips are disabled while a turn is streaming.

- [#262](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/262) [`a85c82c`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a85c82c339b3dd64a87d4513115358a5f6439840) Thanks [@hweej](https://github.com/hweej)! - Fix chat input being pushed off-screen. `ConversationView`'s outer
  container used `height: 100%` while its parent `ChatPanel` was a flex
  column with a `ChatThreadHeader` sibling. The two children's heights
  summed to more than the parent's height, overflowing by the header's
  height and clipping the input row at the bottom. Switching the
  container to `flex: 1, minHeight: 0` makes it share space correctly
  with the header. Symptom became more obvious after the profiler bar
  close button ([#258](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/258)) made the chat container taller.

- [#278](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/278) [`e6477e0`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/e6477e0933b42f0bdc4f59509c64012fe1a3c172) Thanks [@hweej](https://github.com/hweej)! - Fix: aborting a chat turn (especially mid-tool-call) no longer breaks
  the next turn with a `messages[N].role must be 'assistant'` validation
  error. The reducer's `error` case now finalizes the in-flight assistant
  message onto `state.history` (instead of leaving it in `state.current`),
  preserving the user/assistant alternation that the wire protocol
  requires. When abort happens before any text streamed, a synthetic
  `(interrupted)` text part is prepended so the wire content is non-empty
  (Anthropic-style APIs reject empty assistant content). As a side
  benefit, multiple errors that fire across separate turns now render as
  separate bubbles instead of accumulating into one.

- [#261](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/261) [`8761104`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/876110495548fb4b0c0c9b035c5a7bfbf235967d) Thanks [@hweej](https://github.com/hweej)! - Inset the right-sidebar tab labels ("Summary" / "Chat") from the Sider's
  left border so they don't sit flush against the edge.

  This is a tactical fix on the `<Tabs>` element. See [#260](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/260) for the broader
  refactor that would move the gutter responsibility to the Sider container
  and let child panels drop their redundant edge padding.

- [#283](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/283) [`a1862d0`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/a1862d00beb54fff7cec83600c1b0d10d97c5a04) Thanks [@hweej](https://github.com/hweej)! - Feedback comment Send button now disables when the textarea matches the saved
  comment, giving a clear visual signal that a thumbs-down comment was sent
  successfully. Typing more re-enables Send; clearing the textarea after a
  saved comment also re-enables (clearing is a legitimate "remove my comment"
  action).

- [#280](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/280) [`95aaf91`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/95aaf916ad2e361599295e881b117f7daad34d3d) Thanks [@hweej](https://github.com/hweej)! - Add a proactive token refresh timer. While a user is signed in, the app
  calls `POST /api/auth/refresh` every 4 minutes (well before the 5-minute
  access-cookie TTL) so chat requests always cross the boundary with a
  fresh cookie. Also fires once on `visibilitychange` to visible, in case
  the tab was suspended longer than the interval. Replaces the reactive
  refresh-on-401 path for normal usage — the rotation race and clock-skew
  edge cases no longer surface as `Session expired` mid-conversation.

- [#258](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/258) [`72a55cb`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/72a55cb1940290feafc89a9dd54df9e2d6004287) Thanks [@hweej](https://github.com/hweej)! - Profile bar close button now fully removes the bar from the layout
  instead of just hiding it. ProfileBar gained an `onHide` callback prop;
  when invoked, the parent unmounts ProfileBar AND drops the reserved
  bottom padding, so page content reflows into the freed area.
  Behaviour is still session-only — refresh brings the bar back.
- Updated dependencies [[`f691ec8`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f691ec811223156f8e9aad4a27f9ef3ea737bc99), [`1b54449`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/1b54449ccbd34e84c43aa388089f7043a7f547c6), [`07e97e5`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/07e97e53d382aec2d34d67985b2d9923a2b59a5c), [`72a55cb`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/72a55cb1940290feafc89a9dd54df9e2d6004287), [`61fde5f`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/61fde5fa82857df655649e0b817558a6f6ab03b7)]:
  - @cbioportal-cell-explorer/api-client@0.2.0
  - @cbioportal-cell-explorer/profiler@0.2.0
  - @cbioportal-cell-explorer/zarrstore@0.3.0

## 0.3.0

### Minor Changes

- [#238](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/238) [`75e7b30`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/75e7b306da65806e65b18ec5de24091d87d84aa8) Thanks [@hweej](https://github.com/hweej)! - Add chat panel to the right sidebar. Wraps the existing Summary panel in antd Tabs so users can switch between `Summary` and `Chat`. The chat panel streams answers from the new `/api/chat/{slug}` backend (cell-explorer-py PR [#64](https://github.com/cBioPortal/cbioportal-cell-explorer/issues/64)), renders markdown including GFM tables, supports stop / retry / auto-scroll, and dispatches agent `ui_action` events into `applyConfig` so the agent can update the view (color, embedding, etc.). The Chat tab is hidden unless the backend reports `chat_enabled: true` (set when `ANTHROPIC_API_KEY` is configured).

- [#223](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/223) [`3b6a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3b6a076ade457f6cea378fc546eb9f9fa98924f0) Thanks [@hweej](https://github.com/hweej)! - Add dataset catalog integration with credential minting for private zarr stores. ZarrStore.open() and AnnDataStore.open() accept optional overrides for auth headers. Home page shows tabbed Catalog/My URLs with status probing. UserAvatar component with popover sign-out. Support ?dataset=slug URL param and config serialization.

- [#221](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/221) [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc) Thanks [@hweej](https://github.com/hweej)! - Add Keycloak auth support: typed API client with openapi-fetch, auth state in store, sign in/out UI in sidebar

### Patch Changes

- [#232](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/232) [`8e9b4c9`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/8e9b4c9b81c1bce0886b3e3e278b1c6354c55e2a) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Downgrade React to 18 to be closer to cBioPortal's React version

- Updated dependencies [[`75e7b30`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/75e7b306da65806e65b18ec5de24091d87d84aa8), [`3b6a076`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/3b6a076ade457f6cea378fc546eb9f9fa98924f0), [`f6e676a`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/f6e676af2a931f54a44cea33f043b63a79bed7fc)]:
  - @cbioportal-cell-explorer/api-client@0.1.0
  - @cbioportal-cell-explorer/zarrstore@0.2.0

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

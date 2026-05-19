---
"@cbioportal-cell-explorer/highperformer": patch
---

Chat cancellation and streaming UX polish:

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

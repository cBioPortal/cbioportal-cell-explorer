---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix: aborting a chat turn (especially mid-tool-call) no longer breaks
the next turn with a `messages[N].role must be 'assistant'` validation
error. The reducer's `error` case now finalizes the in-flight assistant
message onto `state.history` (instead of leaving it in `state.current`),
preserving the user/assistant alternation that the wire protocol
requires. When abort happens before any text streamed, a synthetic
`(interrupted)` text part is prepended so the wire content is non-empty
(Anthropic-style APIs reject empty assistant content). As a side
benefit, multiple errors that fire across separate turns now render as
separate bubbles instead of accumulating into one.

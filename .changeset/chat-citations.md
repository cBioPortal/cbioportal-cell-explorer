---
"@cbioportal-cell-explorer/highperformer": minor
---

Render citation markers in assistant chat turns as clickable
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

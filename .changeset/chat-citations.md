---
"@cbioportal-cell-explorer/highperformer": minor
---

Render `[t:<tool_use_id>]` citation markers in assistant chat turns as
clickable superscript links. Clicking a citation opens the WhyPanel
and flashes the matching tool row so users can see where a fact came
from. Markers in the same turn are numbered in order of first
appearance — repeated ids reuse their original number.

The agent emits the markers (per cell-explorer-py#105's system prompt
instruction) and `ToolProgress` events carry a `tool_call_id`
(cell-explorer-py#106) — the frontend wires these into citations and
the WhyPanel's row anchors. Unknown/stale ids render as inert citation
labels rather than blocking the text.

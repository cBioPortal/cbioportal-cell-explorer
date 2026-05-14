---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix `applyConfig` silently no-op'ing on filter-clear payloads. The chat
agent's `clear_filter` tool emits `{filter: {obsColumn: "_none", ids: []}}`,
but the prior guard required `ids.length > 0` so the payload was
ignored — the agent would say "filter cleared!" while the filter
stayed active. Empty `ids` now dispatches `clearCustomGroup`.

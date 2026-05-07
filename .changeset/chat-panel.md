---
"@cbioportal-cell-explorer/api-client": minor
"@cbioportal-cell-explorer/highperformer": minor
---

Add chat panel to the right sidebar. Wraps the existing Summary panel in antd Tabs so users can switch between `Summary` and `Chat`. The chat panel streams answers from the new `/api/chat/{slug}` backend (cell-explorer-py PR #64), renders markdown including GFM tables, supports stop / retry / auto-scroll, and dispatches agent `ui_action` events into `applyConfig` so the agent can update the view (color, embedding, etc.). The Chat tab is hidden unless the backend reports `chat_enabled: true` (set when `ANTHROPIC_API_KEY` is configured).

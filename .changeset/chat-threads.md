---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": minor
---

Add chat thread persistence and history. The chat tab now opens to a list of
past conversations on the current dataset. Click a thread to resume it (history
hydrates into the reducer); click "+ New chat" to start a fresh one (auto-titled
from the first user message after the stream's `thread_open` event). Hover a
row to reveal a delete button, confirmed via `Modal.confirm` and persisted via
`DELETE /api/chat/{slug}/threads/{id}`. ChatPanel becomes a mode-based router
(list / new / active), with the conversation render extracted into a dedicated
`ConversationView` component. `useChatTurn`'s `start()` and `chat.streamTurn()`
gain a `threadId` parameter the route uses to attribute messages.

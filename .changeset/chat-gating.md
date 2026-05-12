---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": minor
---

Wire the chat-panel UI to the new per-dataset and per-user chat gates from
cell-explorer-py. The chat tab on the View page is now hidden when
`dataset.chat_enabled` is false. When the tab is visible but the user's
`permission.can_chat` is false, ChatPanel renders a `ChatPermissionBanner`
(sign-in CTA for anonymous, contact-admin copy for missing role) instead of
the chat input. The api-client is regenerated to expose `chat_enabled` on
the dataset shapes and a `permission` field on `ContextResponse`.

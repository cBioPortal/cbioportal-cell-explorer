---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix chat input being pushed off-screen. `ConversationView`'s outer
container used `height: 100%` while its parent `ChatPanel` was a flex
column with a `ChatThreadHeader` sibling. The two children's heights
summed to more than the parent's height, overflowing by the header's
height and clipping the input row at the bottom. Switching the
container to `flex: 1, minHeight: 0` makes it share space correctly
with the header. Symptom became more obvious after the profiler bar
close button (#258) made the chat container taller.

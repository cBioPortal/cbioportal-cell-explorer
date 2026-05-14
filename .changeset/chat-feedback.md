---
"@cbioportal-cell-explorer/highperformer": minor
---

Per-turn thumbs up/down on assistant chat messages. The strip lives
next to the existing WhyPanel chip on each assistant bubble. Thumbs-up
fires immediately with no follow-up; thumbs-down reveals an inline
optional comment textarea. State is toggleable (click an active thumb
to clear) and persists server-side via the new cell-explorer-py
PUT/DELETE feedback endpoints. Reloading a thread shows each assistant
message with the user's previous rating already applied.

---
"@cbioportal-cell-explorer/profiler": minor
"@cbioportal-cell-explorer/highperformer": patch
---

Profile bar close button now fully removes the bar from the layout
instead of just hiding it. ProfileBar gained an `onHide` callback prop;
when invoked, the parent unmounts ProfileBar AND drops the reserved
bottom padding, so page content reflows into the freed area.
Behaviour is still session-only — refresh brings the bar back.

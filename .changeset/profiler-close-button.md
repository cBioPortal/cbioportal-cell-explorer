---
"@cbioportal-cell-explorer/profiler": minor
---

Add a close (X) button to the `ProfileBar` action group. Clicking it hides
the bar for the current session — state is local to the component and
resets on page reload, so the bar reappears automatically next time
without a separate "show profiler" affordance. Helpful during dev when
the bar overlaps UI controls.

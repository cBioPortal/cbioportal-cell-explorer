---
"@cbioportal-cell-explorer/highperformer": minor
---

Fix `set_viewport` to actually take effect at runtime. Previously deck.gl
ignored `initialViewState` changes after the initial mount, so
programmatic viewport overrides only applied on the next embedding switch.

The fix uses deck.gl's prescribed pattern per the perf rule: a
`viewportEpoch` counter signals View.tsx, which imperatively calls
`deckRef.current.deck.setProps({ viewState })` on the underlying Deck
instance. An `onViewStateChange` ref handler keeps deck.gl in sync on
subsequent pan/zoom. No React state for viewState — no per-frame
re-render cost.

Also adds `viewport: null` as a reset-to-fit-to-view sentinel. Pairs with
the upcoming `clear_viewport` agent tool in cell-explorer-py.

---
"@cbioportal-cell-explorer/highperformer": minor
---

Fix `set_viewport` to actually take effect at runtime (previously deck.gl
ignored `initialViewState` changes after first mount, so programmatic
viewport overrides only applied on the next embedding switch).

`useAppStore` now tracks a `viewportEpoch` counter that's part of the
`<DeckGL>` `key` prop. `setViewport()` bumps the counter on every call,
forcing a deck.gl remount that re-reads `initialViewState`.

Trade-off: each programmatic viewport change re-uploads all GPU buffers
(positions, colors, radii). Acceptable for occasional agent-initiated
resets — pan/zoom stays uncontrolled (deck.gl's controller handles it on
the GPU side), preserving the perf rule.

Also adds `viewport: null` as a reset-to-fit-to-view sentinel. Pairs with
the upcoming `clear_viewport` agent tool in cell-explorer-py.

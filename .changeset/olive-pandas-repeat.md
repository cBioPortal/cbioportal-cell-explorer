---
"@cbioportal-cell-explorer/highperformer": patch
---

Add the reverse ("glyph") icon variant as static assets.

A tile-less, transparent version of the Cell Explorer mark, served from `public/`
under `icon-glyph-*` names. The SVG adapts to `prefers-color-scheme`; the PNGs are
baked in the light palette.

Nothing references these yet — they are available for use, not wired into `index.html`.

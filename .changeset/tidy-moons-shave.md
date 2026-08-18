---
"@cbioportal-cell-explorer/highperformer": patch
---

Replace the default Vite favicon with the Cell Explorer icon set.

Adds an SVG favicon, a multi-resolution `favicon.ico` (16/32/48), PNGs at
16/32/48/180/192/512, an apple-touch icon, and a web app manifest, and points
`index.html` at them alongside a `theme-color`.

Manifest paths are relative rather than absolute so they resolve under the
GitHub Pages base path — files in `public/` are copied verbatim by Vite, so
absolute paths there would 404 in production.

# Design source assets

Original design deliverables for `packages/highperformer`. These are **sources**, not
build inputs — nothing in the Vite build reads this directory. The shipped assets live in
`packages/highperformer/public/`.

## `cell-explorer-favicon.zip`

The favicon pack as delivered. Contents:

```
favicon.svg              favicon-180x180.png      apple-touch-icon.png
favicon.ico              favicon-192x192.png      site.webmanifest
favicon-16x16.png        favicon-512x512.png
favicon-32x32.png
favicon-48x48.png
```

Two files in `public/` differ from what this archive contains, so re-extracting over the
top will regress them:

- **`favicon.ico`** — the archive carries a single 16×16 entry. The shipped one is
  multi-resolution (16/32/48), rebuilt with:

  ```sh
  magick favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico
  ```

- **`site.webmanifest`** — the archive uses absolute paths (`"start_url": "/"`,
  `"src": "/favicon-192x192.png"`). Files in `public/` are copied verbatim by Vite, so
  absolute paths there resolve to the domain root and 404 under the GitHub Pages base
  path (`/cbioportal-cell-explorer/`). The shipped manifest uses relative paths
  (`"."`, `"./favicon-…"`), which resolve correctly under both the local and deployed base.

Everything else copies across unchanged.

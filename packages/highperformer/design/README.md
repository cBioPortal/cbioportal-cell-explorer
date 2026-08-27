# Design source assets

Original design deliverables for `packages/highperformer`. These are **sources**, not
build inputs — nothing in the Vite build reads this directory. The shipped assets live in
`packages/highperformer/public/`.

`cbioportal-logo-2024.zip` is the parent cBioPortal brand. Everything else here is Cell
Explorer's own iconography.

## `cbioportal-logo-2024.zip`

The official cBioPortal 2024 lockup, as delivered by the brand owners. Copied from
`cbioportal-frontend/brand_assets/`. Contents:

```
cBioportalLogo2024.svg      cBioportalLogo2024.pdf
cBioportalLogo2024.png      cBioportalLogo2024.ai
```

This is the **parent** brand, not Cell Explorer's own — the packs below are Cell
Explorer's. The lockup is a mark (bracket frame plus four tiles), the word
"cBioPortal", and a "FOR CANCER GENOMICS" descender.

The SVG and PNG are extracted verbatim to `public/brand/cbioportal-logo-2024.{svg,png}`.
The `.ai` and `.pdf` stay in the archive; nothing web-facing needs them.

Three things to know before using it:

- **It is drawn for a light background.** There is no reverse or knockout variant in the
  pack. On the landing page's navy band the blue wordmark measures 3.7:1 and the green
  tile 2.7:1 — logotypes are exempt from WCAG contrast rules, but the full lockup reads
  muddy there. Use it on a light surface, or ask the brand owners for a reverse lockup.
  Do **not** recolor it locally.
- **The descender does not survive small sizes.** Below roughly 120px wide, "FOR CANCER
  GENOMICS" becomes unreadable. Crop to the mark instead.
- **The SVG drives its fills through CSS classes** (`.cls-1` … `.cls-5`) declared in a
  `<style>` block, not through per-element `fill` attributes. Inlining it into a page
  therefore leaks those very generic class names into the document, and any other
  `.cls-1` on the page will collide. Reference it by `src`, or resolve the fills first —
  which is what `src/components/CBioPortalMark.tsx` does.

`CBioPortalMark.tsx` carries the mark alone, cropped to its own bounding box, with the
class-based fills resolved to literal values. Paths and colors are otherwise verbatim.
It is what the landing page header renders.

### The shipped favicon is derived from this mark

The `favicon.*` / `apple-touch-icon.png` files in `public/` are generated from this mark,
not from `cell-explorer-favicon.zip`. The mark sits on a **white** plate — it is drawn for
light backgrounds, and its thin grey bracket disappears on a transparent or navy tile.

Three sizings, because the platforms crop differently:

| Output | Mark fills | Plate | Why |
|---|---|---|---|
| `favicon.svg`, `favicon-{16,32,48,192,512}.png` | 88% | rounded, `rx=96` | Browser tab and manifest `any`. 88% is as tight as it goes — at 94% the top-right tile clips the plate edge. |
| `apple-touch-icon.png`, `favicon-180x180.png` | 76% | square, opaque | iOS applies its own rounded mask and fills transparency with black, so this one must be full-bleed and square. |
| `favicon-maskable-512.png` | 58% | square, opaque | Android maskable icons are cropped to an inner safe zone; anything larger loses its corners. |

Regenerate with `magick` from the mark SVG; `favicon.ico` is multi-resolution, built the
same way as described below:

```sh
magick favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico
```

At 16×16 the mark is soft — four tiles and a hairline bracket is a lot of detail for
256 pixels. Modern browsers prefer `favicon.svg`, which stays crisp.

## `cell-explorer-favicon.zip`

The favicon pack as delivered. Contents:

```
favicon.svg              favicon-180x180.png      apple-touch-icon.png
favicon.ico              favicon-192x192.png      site.webmanifest
favicon-16x16.png        favicon-512x512.png
favicon-32x32.png
favicon-48x48.png
```

**This pack is no longer what `public/` ships.** The favicon there is now built from the
cBioPortal mark (see above); this archive is kept so Cell Explorer's own icon can be
restored. If you do restore it, two files still need the treatment below — the archive's
copies are not directly usable:

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

## `cell-explorer-icon-reverse.zip`

A reverse ("glyph") variant of the same mark: no tile, transparent background. Extracted
verbatim into `public/` under its own `icon-glyph-*` names, so it sits alongside the
favicon set above without colliding. Contents:

```
icon-glyph.svg              icon-glyph-180x180.png    apple-touch-icon-glyph.png
favicon-glyph.ico           icon-glyph-192x192.png
icon-glyph-16x16.png        icon-glyph-512x512.png
icon-glyph-32x32.png
icon-glyph-48x48.png
```

Nothing references these yet — they are available for use, not wired into `index.html`.

Two things to know before using them:

- **Only the SVG adapts to theme.** `icon-glyph.svg` carries a `prefers-color-scheme: dark`
  block that swaps the frame from `#123a5e` to `#eaf1f8` and the glass from white to
  `#12304e`, so it inverts itself on dark backgrounds. The PNGs are baked in the light
  palette — on a dark background the navy frame nearly disappears. Prefer the SVG wherever
  the surface can be either theme.
- **`favicon-glyph.ico` carries a single 16×16 entry**, like the other packs. If it is ever
  used as a real favicon, rebuild it multi-resolution the same way as above.

/**
 * Design tokens for the landing page (`/`).
 *
 * The palette is derived from the product mark in `public/favicon.svg`: a navy
 * frame around a lens magnifying three cells. The three cell colors are the
 * only saturated hues on the page and they are spent entirely on the header's
 * point field — everything below the band stays monochrome so the field reads
 * as the one memorable element.
 */
export const t = {
  // Surfaces
  ink: '#0d2c48',
  inkDeep: '#061a2c',
  paper: '#ffffff',
  mist: '#f5f8fb',
  line: '#e2e9f0',

  // Text
  text: '#12283c',
  textMuted: '#5c7186',
  textFaint: '#8fa2b4',
  onInk: '#eaf1f8',
  onInkMuted: '#93aec9',

  // Cell colors — data only, never chrome
  cellBlue: '#3b6fd0',
  cellGreen: '#2f9e5b',
  cellRed: '#d9433b',

  // Status
  ok: '#2f9e5b',
  warn: '#c98a12',
  bad: '#d9433b',

  /**
   * Reserved for literal machine text — the raw .zarr URL under a dataset name,
   * where telling l from 1 and O from 0 matters. Everything else uses the sans,
   * which is the same face cbioportal.org renders.
   */
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Cascadia Mono", "DejaVu Sans Mono", monospace',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

/**
 * Uppercase label used for eyebrows and section headings.
 *
 * No font-family: it inherits the page's sans, which is the same face
 * cbioportal.org renders. The label reads as a label through case, size and
 * tracking rather than through a different typeface.
 */
export const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}

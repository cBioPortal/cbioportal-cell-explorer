import type { ResolvedBrand } from '../hooks/useBrand'

const HEX = /^#[0-9a-fA-F]{6}$/

export interface ResolvedBrandColors {
  ink: string
  inkDeep: string
  onInk: string
  onInkMuted: string
}

/**
 * Compute the identity band's four colors for a brand, or `null` when nothing
 * should override the authored defaults — either the brand is unset, or its
 * `ink` fails validation.
 *
 * Only `ink` is operator-supplied; the three companions derive from it, because
 * the header band is a gradient from ink to ink-deep carrying on-ink text.
 * Deriving one without the others yields, for example, a warm-black band
 * fading to navy under blue-grey type.
 *
 * Shared by `applyBrandColors` (writes CSS custom properties for the page's
 * chrome) and `CellField` (reads the same values directly, since its SVG
 * stop-colors and noise dots sit inside the band and must not stay baked to
 * navy while the gradient around them rebrands).
 */
export function resolveBrandColors(brand: ResolvedBrand): ResolvedBrandColors | null {
  if (brand.isDefault) return null

  const { ink, inkDeep } = brand.colors
  // The backend validates these, but a value reaching setProperty (or an SVG
  // attribute) is a value reaching a parser — re-check rather than trust the
  // network.
  if (!HEX.test(ink)) return null

  return {
    ink,
    inkDeep: inkDeep && HEX.test(inkDeep) ? inkDeep : `color-mix(in srgb, ${ink} 65%, black)`,
    onInk: `color-mix(in srgb, white 94%, ${ink})`,
    onInkMuted: `color-mix(in srgb, white 62%, ${ink})`,
  }
}

/**
 * Push the brand's colors onto the document as CSS custom properties.
 *
 * These are written under `--brand-*` names, distinct from the `--ink` /
 * `--ink-deep` / `--on-ink` / `--on-ink-muted` names consumed by `index.css`.
 * `.ce-landing` reads them as `var(--brand-ink, #0d2c48)` and so on — a
 * fallback chain, not a self-referential override — so a default brand can
 * leave the `--brand-*` names unset and the page renders from the authored
 * literals in index.css exactly as it does today.
 */
export function applyBrandColors(
  brand: ResolvedBrand,
  root: HTMLElement = document.documentElement,
): void {
  const resolved = resolveBrandColors(brand)
  if (!resolved) return

  root.style.setProperty('--brand-ink', resolved.ink)
  root.style.setProperty('--brand-ink-deep', resolved.inkDeep)
  root.style.setProperty('--brand-on-ink', resolved.onInk)
  root.style.setProperty('--brand-on-ink-muted', resolved.onInkMuted)
}

import type { ResolvedBrand } from '../hooks/useBrand'

const HEX = /^#[0-9a-fA-F]{6}$/

const COLOR_MIX_PROBE = 'color-mix(in srgb, white 94%, black)'

/**
 * Whether this engine parses `color-mix()`. Three of the four identity-band
 * colors are derived with it; on an engine that lacks it, the custom
 * property is still *set* to an unparseable string, which means
 * `var(--brand-ink-deep, #061a2c)` does NOT fall back — the fallback arm
 * only applies when the property is unset — so the property resolves
 * invalid at computed-value time and the declaration that consumes it
 * (a non-inherited `background`) computes to its initial value instead.
 */
function supportsColorMix(): boolean {
  // Absent detection means an environment we cannot ask (jsdom in tests) —
  // assume yes, so tests exercise the real path. Only an explicit `false`
  // disables branding.
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true
  return CSS.supports('color', COLOR_MIX_PROBE)
}

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
  // A bundle degrades branding, never the application: without color-mix()
  // support, fall back to the authored navy rather than write custom
  // properties the engine cannot parse.
  if (!supportsColorMix()) return null

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

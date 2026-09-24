import type { ResolvedBrand } from '../hooks/useBrand'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Push the brand's colors onto the document as CSS custom properties.
 *
 * Only `ink` is operator-supplied; the three companions derive from it, because
 * the header band is a gradient from `--ink` to `--ink-deep` carrying `--on-ink`
 * text. Setting one without the others yields, for example, a warm-black band
 * fading to navy under blue-grey type.
 *
 * A default brand sets nothing at all, so an unbranded deployment renders from
 * the authored literals in index.css and never depends on this having run.
 */
export function applyBrandColors(
  brand: ResolvedBrand,
  root: HTMLElement = document.documentElement,
): void {
  if (brand.isDefault) return

  const { ink, inkDeep } = brand.colors
  // The backend validates these, but a value reaching setProperty is a value
  // reaching the CSS parser — re-check rather than trust the network.
  if (!HEX.test(ink)) return

  root.style.setProperty('--ink', ink)
  root.style.setProperty(
    '--ink-deep',
    inkDeep && HEX.test(inkDeep) ? inkDeep : `color-mix(in srgb, ${ink} 65%, black)`,
  )
  root.style.setProperty('--on-ink', `color-mix(in srgb, white 94%, ${ink})`)
  root.style.setProperty('--on-ink-muted', `color-mix(in srgb, white 62%, ${ink})`)
}

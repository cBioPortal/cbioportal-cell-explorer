import { useMemo } from 'react'
import type { components } from '@cbioportal-cell-explorer/api-client'
import useAppStore from '../store/useAppStore'

type BrandInfo = components['schemas']['BrandInfo']

export type ResolvedBrand = {
  name: string
  tagline: string
  logoOnLight: string | null
  logoOnDark: string | null
  logoAlt: string
  logoHref: string | null
  colors: { ink: string; inkDeep: string | null; themeColor: string }
  /** True when the deployment supplied no brand and cBioPortal's identity applies. */
  isDefault: boolean
}

/**
 * cBioPortal's own identity, used whenever `/api/info` reports no brand.
 *
 * These values mirror the backend's `DEFAULT_BRAND`. They are duplicated rather
 * than fetched because the page must render correctly before — and even without —
 * a successful call to the backend, which is also how the GitHub Pages build works.
 */
export const DEFAULT_BRAND: ResolvedBrand = {
  name: 'cBioPortal',
  tagline: 'Explore millions of cells in your browser.',
  logoOnLight: null,
  logoOnDark: null,
  logoAlt: 'cBioPortal',
  logoHref: null,
  colors: { ink: '#0d2c48', inkDeep: null, themeColor: '#123a5e' },
  isDefault: true,
}

/**
 * Only `http:`/`https:` may reach the `href` on the rendered logo link.
 * React ships whatever it is given as an attribute (it only warns, at dev
 * time, on `javascript:`), so a hostile or corrupted brand bundle yielding
 * `logo_href: "javascript:..."` would otherwise produce a live clickable
 * script URL. The backend validates this too, but `logoHref` reaches an
 * executable sink rather than a parser, so the frontend re-checks here —
 * the same rationale `resolveBrandColors` already applies to colors.
 */
function sanitizeHref(href: string | null | undefined): string | null {
  if (!href) return null
  try {
    // No base: a relative href has no scheme to validate, so it is rejected
    // along with anything explicitly dangerous (e.g. `javascript:`).
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? href : null
  } catch {
    return null
  }
}

/** Merge a backend brand over the defaults. Pure; exported for tests. */
export function resolveBrand(brand: BrandInfo | null): ResolvedBrand {
  if (!brand) return DEFAULT_BRAND
  return {
    name: brand.name,
    tagline: brand.tagline,
    logoOnLight: brand.logo_on_light ?? null,
    logoOnDark: brand.logo_on_dark ?? null,
    logoAlt: brand.logo_alt,
    logoHref: sanitizeHref(brand.logo_href),
    colors: {
      ink: brand.colors.ink,
      inkDeep: brand.colors.ink_deep ?? null,
      themeColor: brand.colors.theme_color,
    },
    isDefault: false,
  }
}

/**
 * The deployment's branding, fully resolved — every field present, never undefined.
 *
 * The selector returns the store's own `brand` reference rather than building an
 * object, because a selector that constructs a value re-renders forever.
 */
export function useBrand(): ResolvedBrand {
  const brand = useAppStore((s) => s.backendInfo?.brand ?? null)
  return useMemo(() => resolveBrand(brand), [brand])
}

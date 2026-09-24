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

/** Merge a backend brand over the defaults. Pure; exported for tests. */
export function resolveBrand(brand: BrandInfo | null): ResolvedBrand {
  if (!brand) return DEFAULT_BRAND
  return {
    name: brand.name,
    tagline: brand.tagline,
    logoOnLight: brand.logo_on_light ?? null,
    logoOnDark: brand.logo_on_dark ?? null,
    logoAlt: brand.logo_alt,
    logoHref: brand.logo_href ?? null,
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

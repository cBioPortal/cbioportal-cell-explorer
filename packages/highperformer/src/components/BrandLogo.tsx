import CBioPortalMark from './CBioPortalMark'
import { useBrand } from '../hooks/useBrand'

/**
 * The deployment's mark: the operator's logo when one is configured, otherwise
 * the built-in cBioPortal mark.
 *
 * `onDark` and `onLight` are separate assets rather than one recolored by CSS.
 * Brand marks arrive with their fills baked in, and recoloring a vendor's mark is
 * both unreliable and something brand teams object to.
 */
export default function BrandLogo({
  variant = 'onDark',
}: {
  variant?: 'onDark' | 'onLight'
}) {
  const brand = useBrand()
  const src = variant === 'onDark' ? brand.logoOnDark : brand.logoOnLight

  const mark = src ? (
    <img className="ce-brand-logo" src={src} alt={brand.logoAlt} />
  ) : (
    <CBioPortalMark title={brand.name} />
  )

  if (!brand.logoHref) return mark

  return (
    <a
      className="ce-brand-link"
      href={brand.logoHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {mark}
    </a>
  )
}

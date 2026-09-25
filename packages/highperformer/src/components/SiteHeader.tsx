import CellField from './CellField'
import BrandLogo from './BrandLogo'
import CBioPortalMark from './CBioPortalMark'
import UserAvatar from './UserAvatar'
import OverviewStats, { type Stat } from './OverviewStats'
import { useBrand } from '../hooks/useBrand'

/**
 * Full-bleed identity band for `/`. The deployment's mark carries the parent
 * brand — the cBioPortal mark only when unbranded; "Cell Explorer" is set in
 * the same monospace that labels the data below it — this is a tool for
 * people who live in notebooks and terminals, and the type says so before
 * the copy does.
 */
export default function SiteHeader({ stats }: { stats: Stat[] }) {
  const brand = useBrand()
  return (
    <header className="ce-header">
      <CellField />
      <div className="ce-header-inner">
        <div className="ce-header-row">
          <div>
            <div className="ce-lockup">
              <BrandLogo variant="onDark" />
              <div className="ce-lockup-names">
                <h1 className="ce-wordmark">Cell Explorer</h1>
                {/* Fixed platform attribution — not configurable, by product
                    decision. Set as sub-text to the product name: the thing it
                    qualifies is "Cell Explorer", not the operator's identity. */}
                <p className="ce-poweredby">
                  {/* The mark only when an operator brand is present. Unbranded,
                      the lockup's own logo IS the cBioPortal mark, so repeating
                      it here says the same thing twice. The attribution TEXT is
                      never conditional — that is the part that must not be
                      suppressible. */}
                  {!brand.isDefault && <CBioPortalMark size={18} title="cBioPortal" />}
                  Powered by cBioPortal
                </p>
              </div>
            </div>
            <p className="ce-tagline">{brand.tagline}</p>
          </div>
          <div className="ce-header-actions">
            <UserAvatar onDark />
          </div>
        </div>
        <OverviewStats stats={stats} />
      </div>
    </header>
  )
}

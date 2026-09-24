import CellField from './CellField'
import BrandLogo from './BrandLogo'
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
              <h1 className="ce-wordmark">Cell Explorer</h1>
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

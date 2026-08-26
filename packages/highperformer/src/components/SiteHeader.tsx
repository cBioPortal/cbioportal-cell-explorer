import CellField from './CellField'
import CBioPortalMark from './CBioPortalMark'
import UserAvatar from './UserAvatar'
import OverviewStats, { type Stat } from './OverviewStats'

/**
 * Full-bleed identity band for `/`. The official cBioPortal mark carries the
 * parent brand; "Cell Explorer" is set in the same monospace that labels the
 * data below it — this is a tool for people who live in notebooks and
 * terminals, and the type says so before the copy does.
 */
export default function SiteHeader({ stats }: { stats: Stat[] }) {
  return (
    <header className="ce-header">
      <CellField />
      <div className="ce-header-inner">
        <div className="ce-header-row">
          <div>
            <div className="ce-lockup">
              <CBioPortalMark />
              <h1 className="ce-wordmark">Cell Explorer</h1>
            </div>
            <p className="ce-tagline">Explore millions of cells in your browser.</p>
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

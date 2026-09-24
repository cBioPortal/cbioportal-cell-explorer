import CBioPortalMark from './CBioPortalMark'

/**
 * Platform attribution.
 *
 * Deliberately takes no props and reads no brand config. Cell Explorer is a
 * cBioPortal product whatever identity a deployment wears, and that line is
 * fixed by product decision — see the branding design spec. An operator who
 * objects can patch the source; the shipped product always attributes.
 */
export default function SiteFooter() {
  return (
    <footer className="ce-footer">
      <div className="ce-footer-inner">
        <CBioPortalMark size={22} />
        <span>Powered by cBioPortal</span>
      </div>
    </footer>
  )
}

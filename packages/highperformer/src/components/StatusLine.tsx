import { t } from './landingTokens'
import type { ProbeResult } from '../hooks/useDatasetProbes'

/**
 * Access + reachability for one dataset, set in the utility mono face so it
 * reads as instrument output rather than prose. Shared by the landing page and
 * the collection detail page.
 */
export default function StatusLine({
  probe,
  isPublic,
}: {
  probe?: ProbeResult
  isPublic: boolean
}) {
  const accessLabel = isPublic ? 'Public' : 'Private'
  const accessColor = isPublic ? t.ok : t.warn

  let reachLabel: string
  let reachColor: string
  if (!probe) {
    reachLabel = isPublic ? '' : 'Requires sign-in'
    reachColor = t.textFaint
  } else if (probe.status === 'pending') {
    reachLabel = 'Checking'
    reachColor = t.textFaint
  } else if (probe.status === 'ok') {
    reachLabel = probe.version ? `Reachable · v${probe.version}` : 'Reachable'
    reachColor = t.ok
  } else {
    reachLabel = 'Unreachable'
    reachColor = t.bad
  }

  return (
    <div
      style={{
        fontFamily: t.mono,
        fontSize: 11,
        letterSpacing: '0.02em',
        marginTop: 6,
        // Access and reachability are one statement; never break it across lines.
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: accessColor }}>● {accessLabel}</span>
      {reachLabel && (
        <>
          <span style={{ color: t.line, margin: '0 7px' }}>|</span>
          <span style={{ color: reachColor }}>{reachLabel}</span>
        </>
      )}
    </div>
  )
}

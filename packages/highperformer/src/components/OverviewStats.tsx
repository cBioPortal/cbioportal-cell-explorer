import { labelStyle } from './landingTokens'

export interface Stat {
  label: string
  value: string
  /** Rendered under the figure while counts are still arriving. */
  note?: string
}

/**
 * The band's figures. Set in the same monospace as the wordmark, at a size that
 * makes them the second thing you read after the product name.
 */
export default function OverviewStats({ stats }: { stats: Stat[] }) {
  return (
    <dl className="ce-stats" aria-label="Overview">
      {stats.map((s) => (
        <div className="ce-stat" key={s.label}>
          <dd className="ce-stat-value">{s.value}</dd>
          <dt className="ce-stat-label" style={labelStyle}>{s.label}</dt>
          {s.note && <span className="ce-stat-note">{s.note}</span>}
        </div>
      ))}
    </dl>
  )
}

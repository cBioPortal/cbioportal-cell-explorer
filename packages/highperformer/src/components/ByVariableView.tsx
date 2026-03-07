import { useMemo } from 'react'
import useAppStore from '../store/useAppStore'
import type { SelectionGroup } from '../store/useAppStore'
import CategorySummaryChart from './CategorySummaryChart'
import ExpressionSummaryChart from './ExpressionSummaryChart'
import type { SummaryResult } from '../hooks/useSummaryData'

interface ByVariableViewProps {
  results: SummaryResult[]
  groups?: SelectionGroup[]
}

export default function ByVariableView({ results, groups: groupsOverride }: ByVariableViewProps) {
  const selectionGroups = useAppStore((s) => s.selectionGroups)
  const groups = useMemo(
    () => groupsOverride ?? selectionGroups.filter((g) => g.indices.length > 0),
    [groupsOverride, selectionGroups],
  )

  if (results.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {results.map((r) => {
        if (r.type === 'category') {
          return (
            <div key={r.name} style={{ flex: '1 1 240px', maxWidth: '100%', minWidth: 0 }}>
              <CategorySummaryChart
                name={r.name}
                categoryMap={r.categoryMap}
                countsByGroup={r.countsByGroup}
                groups={groups}
              />
            </div>
          )
        }
        return (
          <div key={r.name} style={{ flex: '1 1 240px', maxWidth: '100%', minWidth: 0 }}>
            <ExpressionSummaryChart
              name={r.name}
              dataKey={r.dataKey}
              statsByGroup={r.statsByGroup}
              groups={groups}
            />
          </div>
        )
      })}
    </div>
  )
}

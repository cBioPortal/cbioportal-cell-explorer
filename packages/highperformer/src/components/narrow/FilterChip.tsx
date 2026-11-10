import useAppStore from '../../store/useAppStore'
import { chipStyle } from './chipStyle'

/**
 * While cells are filtered — by the chat agent or a cBioPortal embed — says so
 * and offers a way out. Narrow screens have no selection toolbar to clear it.
 */
export function FilterChip() {
  const hasFilter = useAppStore((s) => s.selectionGroups.length > 0)
  const clearAllSelections = useAppStore((s) => s.clearAllSelections)
  if (!hasFilter) return null
  return (
    <div style={{ ...chipStyle, top: 44, left: 8, cursor: 'default' }}>
      <span>Filter active</span>
      <button
        type="button"
        onClick={clearAllSelections}
        style={{ border: 0, background: 'transparent', color: '#1677ff', padding: 0, cursor: 'pointer', fontSize: 12 }}
      >
        Clear
      </button>
    </div>
  )
}

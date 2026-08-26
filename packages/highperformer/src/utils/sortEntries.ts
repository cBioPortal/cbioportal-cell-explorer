import type { DatasetEntry } from './datasetEntries'
import type { ProbeResult } from '../hooks/useDatasetProbes'

export type SortOrder = 'ascend' | 'descend' | null | undefined

/**
 * antd negates a comparator's result for descending order. Pre-negating the
 * unknown-value cases cancels that out, so a dataset whose probe has not
 * answered stays pinned to the bottom whichever way the column is sorted — it
 * is unknown, not smallest, and flipping direction should not promote it.
 */
function unknownFactor(order: SortOrder): number {
  return order === 'descend' ? -1 : 1
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function compareByName(a: DatasetEntry, b: DatasetEntry): number {
  return collator.compare(a.name, b.name)
}

export function compareByCollection(
  a: DatasetEntry,
  b: DatasetEntry,
  order?: SortOrder,
): number {
  const av = a.collectionName ?? ''
  const bv = b.collectionName ?? ''
  if (!av || !bv) {
    if (!av && !bv) return 0
    return (av ? -1 : 1) * unknownFactor(order)
  }
  return collator.compare(av, bv)
}

/** Comparator over a probed dimension — `nObs` (cells) or `nVar` (genes). */
export function makeShapeComparator(
  probes: Map<string, ProbeResult>,
  field: 'nObs' | 'nVar',
) {
  return (a: DatasetEntry, b: DatasetEntry, order?: SortOrder): number => {
    const av = probes.get(a.key)?.shape?.[field]
    const bv = probes.get(b.key)?.shape?.[field]
    if (av == null || bv == null) {
      if (av == null && bv == null) return 0
      return (av == null ? 1 : -1) * unknownFactor(order)
    }
    return av - bv
  }
}

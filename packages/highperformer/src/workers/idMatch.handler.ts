import type { IdMatchMessage, IdMatchResult } from './idMatch.schemas'

export function handleIdMatchMessage(msg: IdMatchMessage): IdMatchResult {
  const { values, targetIds, version } = msg

  const targetSet = new Set(targetIds)
  const matchingIndices: number[] = []
  const foundIds = new Set<string>()
  const indexMap: Record<string, number[]> = {}

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i] ?? '')
    if (targetSet.has(val)) {
      matchingIndices.push(i)
      foundIds.add(val)
      if (!indexMap[val]) indexMap[val] = []
      indexMap[val].push(i)
    }
  }

  const matchedIds = targetIds.filter((id) => foundIds.has(id))
  const unmatchedIds = targetIds.filter((id) => !foundIds.has(id))

  return {
    type: 'matchByIdsResult',
    indices: new Uint32Array(matchingIndices),
    matchedIds,
    unmatchedIds,
    indexMap,
    version,
  }
}

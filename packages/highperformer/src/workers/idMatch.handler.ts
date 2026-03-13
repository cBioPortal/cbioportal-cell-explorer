import type { IdMatchMessage, IdMatchResult } from './idMatch.schemas'

export function handleIdMatchMessage(msg: IdMatchMessage): IdMatchResult {
  const { values, targetIds, version } = msg

  const targetSet = new Set(targetIds)
  const matchingIndices: number[] = []
  const foundIds = new Set<string>()

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i] ?? '')
    if (targetSet.has(val)) {
      matchingIndices.push(i)
      foundIds.add(val)
    }
  }

  const matchedIds = targetIds.filter((id) => foundIds.has(id))
  const unmatchedIds = targetIds.filter((id) => !foundIds.has(id))

  return {
    type: 'matchByIdsResult',
    indices: new Uint32Array(matchingIndices),
    matchedIds,
    unmatchedIds,
    version,
  }
}

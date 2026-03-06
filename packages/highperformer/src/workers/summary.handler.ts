import type { SummaryMessage, SummaryResponse } from './summary.schemas'

export function handleSummaryMessage(msg: SummaryMessage): SummaryResponse {
  const { version } = msg

  if (msg.type === 'summarizeCategory') {
    const { codes, indices, numCategories } = msg
    const counts = new Uint32Array(numCategories)
    for (let i = 0; i < indices.length; i++) {
      const code = codes[indices[i]]
      counts[code]++
    }
    return { type: 'categorySummary', counts, version }
  }

  // summarizeExpression
  const { expression, indices, numBins } = msg

  if (indices.length === 0) {
    return {
      type: 'expressionSummary',
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0,
      bins: new Uint32Array(numBins),
      binEdges: new Float32Array(numBins + 1),
      version,
    }
  }

  // Collect values for selected indices
  const values = new Float32Array(indices.length)
  let sum = 0
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < indices.length; i++) {
    const v = expression[indices[i]]
    values[i] = v
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }

  const n = values.length
  const mean = sum / n

  // Sort for median
  values.sort()
  const median =
    n % 2 === 1
      ? values[(n - 1) / 2]
      : (values[n / 2 - 1] + values[n / 2]) / 2

  // Population standard deviation
  let sumSqDiff = 0
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean
    sumSqDiff += d * d
  }
  const std = Math.sqrt(sumSqDiff / n)

  // Histogram
  const bins = new Uint32Array(numBins)
  const binEdges = new Float32Array(numBins + 1)
  const range = max - min

  if (range === 0) {
    // All values are identical — put everything in the first bin
    bins[0] = n
    for (let i = 0; i <= numBins; i++) {
      binEdges[i] = min
    }
  } else {
    const binWidth = range / numBins
    for (let i = 0; i <= numBins; i++) {
      binEdges[i] = min + i * binWidth
    }
    for (let i = 0; i < n; i++) {
      let bin = Math.floor((values[i] - min) / binWidth)
      if (bin >= numBins) bin = numBins - 1
      bins[bin]++
    }
  }

  return {
    type: 'expressionSummary',
    mean,
    median,
    std,
    min,
    max,
    bins,
    binEdges,
    version,
  }
}

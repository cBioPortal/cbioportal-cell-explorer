export interface GroupStats {
  group: string;
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  nonzeroCount: number;
  nonzeroPct: number;
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeStats(values: ArrayLike<number>): Omit<GroupStats, "group"> {
  const n = values.length;
  if (n === 0) {
    return { count: 0, mean: 0, median: 0, std: 0, min: 0, max: 0, nonzeroCount: 0, nonzeroPct: 0 };
  }

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let nonzero = 0;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (v !== 0) nonzero++;
  }

  const mean = sum / n;

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    sumSqDiff += d * d;
  }
  const std = Math.sqrt(sumSqDiff / n);

  // Sort a copy for median
  const sorted = Array.from(values as ArrayLike<number>).sort((a, b) => a - b);

  return {
    count: n,
    mean,
    median: median(sorted),
    std,
    min,
    max,
    nonzeroCount: nonzero,
    nonzeroPct: (nonzero / n) * 100,
  };
}

export function computeGroupedStats(
  values: ArrayLike<number>,
  labels: ArrayLike<string | number | null>,
): GroupStats[] {
  const groups = new Map<string, number[]>();

  for (let i = 0; i < values.length; i++) {
    const label = String(labels[i] ?? "null");
    let arr = groups.get(label);
    if (!arr) {
      arr = [];
      groups.set(label, arr);
    }
    arr.push(values[i]);
  }

  const results: GroupStats[] = [];
  for (const [group, vals] of groups) {
    const s = computeStats(vals);
    results.push({ group, ...s });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);
  return results;
}

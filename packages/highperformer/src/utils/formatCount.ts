/**
 * Compact count for display: 927205 → "927K", 4200000 → "4.2M".
 *
 * Cell counts run from thousands to tens of millions, so the exact digits are
 * noise at a glance — the magnitude is the information. One decimal only below
 * 10 of a unit, where the difference between 1.2M and 1.8M still matters.
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1000) return String(n)

  const units: Array<[number, string]> = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [size, suffix] of units) {
    if (n >= size) {
      const scaled = n / size
      const digits = scaled < 10 ? 1 : 0
      return `${scaled.toFixed(digits).replace(/\.0$/, '')}${suffix}`
    }
  }
  return String(n)
}

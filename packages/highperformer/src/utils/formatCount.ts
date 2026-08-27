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
  const render = (value: number, [size, suffix]: [number, string]) => {
    const scaled = value / size
    const digits = scaled < 10 ? 1 : 0
    return { text: `${scaled.toFixed(digits).replace(/\.0$/, '')}${suffix}`, scaled, digits }
  }

  for (let i = 0; i < units.length; i++) {
    const [size] = units[i]
    if (n < size) continue

    const here = render(n, units[i])
    // Rounding can carry a value up out of its unit: 999,999 is under a million
    // but rounds to "1000K", so it belongs to the unit above.
    if (Number(here.scaled.toFixed(here.digits)) >= 1000 && i > 0) {
      return render(n, units[i - 1]).text
    }
    return here.text
  }
  return String(n)
}

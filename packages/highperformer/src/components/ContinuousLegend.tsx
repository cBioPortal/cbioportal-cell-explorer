import type { ColorScale } from '../utils/colors'

interface ContinuousLegendProps {
  range: { min: number; max: number } | null
  scale: ColorScale
  label: string
}

export default function ContinuousLegend({ range, scale, label }: ContinuousLegendProps) {
  if (!range) return null

  // Sample 5 evenly spaced stops for the CSS gradient
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const idx = t * (scale.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, scale.length - 1)
    const frac = idx - lo
    const r = Math.round(scale[lo][0] + (scale[hi][0] - scale[lo][0]) * frac)
    const g = Math.round(scale[lo][1] + (scale[hi][1] - scale[lo][1]) * frac)
    const b = Math.round(scale[lo][2] + (scale[hi][2] - scale[lo][2]) * frac)
    return `rgb(${r}, ${g}, ${b})`
  })

  const gradient = `linear-gradient(to right, ${stops.join(', ')})`

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, marginBottom: 4, color: '#888' }}>{label}</div>
      <div style={{ height: 12, borderRadius: 3, background: gradient }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
        <span>{range.min.toFixed(2)}</span>
        <span>{range.max.toFixed(2)}</span>
      </div>
    </div>
  )
}

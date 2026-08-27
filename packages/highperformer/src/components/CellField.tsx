import { t } from './landingTokens'

/**
 * The header's background: a static, seeded scatter of points arranged in soft
 * clusters — the shape of a UMAP embedding, which is the thing this product
 * actually renders. Generated once at module scope from a deterministic PRNG so
 * the composition never shifts between loads and never costs a re-render.
 *
 * Deliberately static. This page sits one click away from a canvas holding 10M
 * points; a decorative animation here would be the wrong thing to spend frames
 * on, and the field reads as data precisely because it holds still.
 */

// Aspect chosen to sit close to the band's own, so `slice` crops only a little
// and the clusters stay whole.
const VIEW_W = 1600
const VIEW_H = 260

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0x5ce11)

/** Box–Muller, drawing from the same seeded stream so clusters stay stable. */
function gauss(): number {
  const u = Math.max(rand(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

interface Cluster {
  cx: number
  cy: number
  n: number
  sd: number
  color: string
}

/**
 * Dense islands sit right-of-centre; the left third carries only sparse, dim
 * stragglers so the type sits *in* the embedding rather than on a panel beside
 * it. Two clusters bleed past the right edge — an embedding does not stop at
 * the frame.
 */
const CLUSTERS: Cluster[] = [
  { cx: 1180, cy: 92, n: 150, sd: 58, color: t.cellBlue },
  { cx: 1330, cy: 190, n: 115, sd: 48, color: t.cellGreen },
  { cx: 1050, cy: 205, n: 88, sd: 42, color: t.cellRed },
  { cx: 1520, cy: 74, n: 80, sd: 46, color: t.cellBlue },
  { cx: 930, cy: 96, n: 64, sd: 50, color: t.cellGreen },
  { cx: 1430, cy: 236, n: 52, sd: 44, color: t.cellRed },
  { cx: 720, cy: 178, n: 46, sd: 58, color: t.cellBlue },
  { cx: 470, cy: 214, n: 34, sd: 64, color: t.cellGreen },
  { cx: 210, cy: 96, n: 24, sd: 66, color: t.cellBlue },
]

interface Point {
  x: number
  y: number
  r: number
  o: number
  c: string
}

const POINTS: Point[] = []

for (const cluster of CLUSTERS) {
  for (let i = 0; i < cluster.n; i++) {
    POINTS.push({
      x: cluster.cx + gauss() * cluster.sd,
      y: cluster.cy + gauss() * cluster.sd * 0.82,
      r: 1.5 + rand() * 1.9,
      o: 0.18 + rand() * 0.34,
      c: cluster.color,
    })
  }
}

// Unclustered noise — a real embedding always has stragglers between islands.
for (let i = 0; i < 90; i++) {
  POINTS.push({
    x: rand() * VIEW_W,
    y: rand() * VIEW_H,
    r: 1.1 + rand() * 1.1,
    o: 0.07 + rand() * 0.1,
    c: t.onInkMuted,
  })
}

export default function CellField() {
  return (
    <svg
      className="ce-field"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ce-field-scrim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={t.ink} stopOpacity="0.92" />
          <stop offset="0.34" stopColor={t.ink} stopOpacity="0.66" />
          <stop offset="0.62" stopColor={t.ink} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        {POINTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} />
        ))}
      </g>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#ce-field-scrim)" />
    </svg>
  )
}

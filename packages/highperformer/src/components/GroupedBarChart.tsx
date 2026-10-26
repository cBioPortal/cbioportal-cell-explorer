import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";

export type GroupedBarValueKind = "fraction" | "count" | "mean_expression";

/** Payload of the chat agent's `grouped_bar` chart (plot_bar tool). */
export type GroupedBarData = {
  title: string;
  value_kind: GroupedBarValueKind;
  obs_column: string;
  /** Rows on the y-axis (cell types, genes, or the groups themselves). */
  categories: string[];
  /** One bar per series within each row. */
  series: string[];
  /** values[i][j] is categories[i], series[j]. */
  values: number[][];
  n_cells: number[];
  where?: Record<string, string> | null;
};

export type GroupedBarChartProps = {
  data: GroupedBarData;
  width?: number;
};

// Tableau 10, so the compared groups stay distinguishable.
export const SERIES_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

const DEFAULT_WIDTH = 280;
const BAR_HEIGHT = 10;
const MARGIN = { top: 8, right: 44, bottom: 28 };

export function formatGroupedBarValue(v: number, kind: GroupedBarValueKind): string {
  if (kind === "fraction") return `${(v * 100).toFixed(1)}%`;
  if (kind === "count") return Math.round(v).toLocaleString();
  if (v !== 0 && Math.abs(v) < 0.01) return v.toExponential(1);
  return v.toFixed(2);
}

function formatAxisTick(v: number, kind: GroupedBarValueKind): string {
  if (kind === "fraction") return `${Math.round(v * 100)}%`;
  if (kind === "count") return Math.round(v).toLocaleString();
  return String(Number(v.toPrecision(3)));
}

export function describeWhere(where: GroupedBarData["where"]): string | null {
  if (!where) return null;
  const parts = Object.entries(where).map(([k, v]) => `${k} = ${v}`);
  return parts.length ? `Only cells where ${parts.join(", ")}` : null;
}

export function isGroupedBarData(d: unknown): d is GroupedBarData {
  const x = d as GroupedBarData | null;
  return (
    !!x &&
    Array.isArray(x.categories) &&
    Array.isArray(x.series) &&
    Array.isArray(x.values) &&
    x.values.length === x.categories.length
  );
}

export default function GroupedBarChart({ data, width = DEFAULT_WIDTH }: GroupedBarChartProps) {
  const { categories, series, values, value_kind } = data;
  if (!categories.length || !series.length) return null;

  const longest = Math.max(...categories.map((c) => c.length));
  // ~6px per character at fontSize 10, plus tick + gap.
  const left = Math.min(150, Math.max(40, longest * 6.2 + 18));
  const bandH = series.length * BAR_HEIGHT + 6;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const innerH = categories.length * bandH;
  const height = MARGIN.top + innerH + MARGIN.bottom;

  const flat = values.flat().filter(Number.isFinite);
  const lo = Math.min(0, ...flat);
  const hi = Math.max(0, ...flat);
  const xScale = scaleLinear({
    domain: [lo, hi > lo ? hi : lo + 1],
    range: [0, innerW],
    nice: true,
  });
  const yScale = scaleBand<string>({ domain: categories, range: [0, innerH], padding: 0.15 });
  const inner = scaleBand<string>({ domain: series, range: [0, yScale.bandwidth()] });
  const x0 = xScale(0);
  const whereText = describeWhere(data.where);

  return (
    <div style={{ width, maxWidth: width }}>
      <div style={{ fontSize: 12, color: "#555" }}>{data.title}</div>
      {whereText && <div style={{ fontSize: 11, color: "#888" }}>{whereText}</div>}
      {series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11, color: "#555", marginTop: 4 }}>
          {series.map((s, j) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 2, background: SERIES_COLORS[j % SERIES_COLORS.length] }}
              />
              {s}
              {data.n_cells?.[j] !== undefined && (
                <span style={{ color: "#999" }}>(n={data.n_cells[j].toLocaleString()})</span>
              )}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label={data.title}>
        <Group top={MARGIN.top} left={left}>
          {categories.map((c, i) => {
            const y = yScale(c) ?? 0;
            return series.map((s, j) => {
              const v = values[i]?.[j];
              if (v === undefined || !Number.isFinite(v)) return null;
              const xv = xScale(v);
              const by = y + (inner(s) ?? 0);
              const bh = Math.max(1, inner.bandwidth() - 1);
              const label = formatGroupedBarValue(v, value_kind);
              return (
                <g key={`${c}-${s}`}>
                  <rect
                    x={Math.min(x0, xv)}
                    y={by}
                    width={Math.abs(xv - x0)}
                    height={bh}
                    fill={SERIES_COLORS[j % SERIES_COLORS.length]}
                    rx={1}
                  >
                    <title>{`${c} — ${s}: ${label}`}</title>
                  </rect>
                  {/* Negative bars put their label right of zero, clear of the axis. */}
                  <text
                    x={v >= 0 ? xv + 3 : x0 + 3}
                    y={by + bh / 2}
                    dy="0.35em"
                    fontSize={9}
                    fill="#666"
                  >
                    {label}
                  </text>
                </g>
              );
            });
          })}
          {lo < 0 && <line x1={x0} x2={x0} y1={0} y2={innerH} stroke="#999" />}
          <AxisLeft
            scale={yScale}
            stroke="#ccc"
            tickStroke="#ccc"
            tickLabelProps={{ fontSize: 10, textAnchor: "end", dx: -4, dy: 3, fill: "#555" }}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={4}
            tickFormat={(v) => formatAxisTick(Number(v), value_kind)}
            tickLabelProps={{ fontSize: 9, textAnchor: "middle", fill: "#777" }}
          />
        </Group>
      </svg>
    </div>
  );
}

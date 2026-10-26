import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
import { SERIES_COLORS } from "./GroupedBarChart";

/** Payload of the chat agent's `diverging_bar` chart (compare_groups tool). */
export type DivergingBarData = {
  obs_column: string;
  group_a: string;
  group_b: string;
  genes: { symbol: string; cohens_d: number }[];
};

export type DivergingBarChartProps = {
  data: DivergingBarData;
  width?: number;
};

const DEFAULT_WIDTH = 280;
const ROW_HEIGHT = 14;
const MARGIN = { top: 4, right: 8, bottom: 28, left: 8 };
const COLOR_A = SERIES_COLORS[0];
const COLOR_B = SERIES_COLORS[1];

export function isDivergingBarData(d: unknown): d is DivergingBarData {
  const x = d as DivergingBarData | null;
  return !!x && Array.isArray(x.genes) && typeof x.group_a === "string";
}

/** Genes sorted from most A-higher (top) to most B-higher (bottom). */
export function sortByEffect(genes: DivergingBarData["genes"]) {
  return genes.filter((g) => Number.isFinite(g.cohens_d)).sort((a, b) => b.cohens_d - a.cohens_d);
}

export default function DivergingBarChart({ data, width = DEFAULT_WIDTH }: DivergingBarChartProps) {
  const genes = sortByEffect(data.genes);
  if (!genes.length) return null;

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = genes.length * ROW_HEIGHT;
  const height = MARGIN.top + innerH + MARGIN.bottom;
  const maxAbs = Math.max(...genes.map((g) => Math.abs(g.cohens_d))) || 1;
  const xScale = scaleLinear({ domain: [-maxAbs, maxAbs], range: [0, innerW], nice: true });
  const yScale = scaleBand<string>({ domain: genes.map((g) => g.symbol), range: [0, innerH], padding: 0.2 });
  const x0 = xScale(0);

  return (
    <div style={{ width, maxWidth: width }}>
      <div style={{ fontSize: 12, color: "#555" }}>
        Top genes: <b>{data.group_a}</b> vs <b>{data.group_b}</b> (Cohen's d)
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
        <span style={{ color: COLOR_B }}>← higher in {data.group_b}</span>
        <span style={{ color: COLOR_A }}>higher in {data.group_a} →</span>
      </div>
      <svg width={width} height={height} role="img" aria-label={`${data.group_a} vs ${data.group_b}`}>
        <Group top={MARGIN.top} left={MARGIN.left}>
          {genes.map((g) => {
            const y = yScale(g.symbol) ?? 0;
            const bh = yScale.bandwidth();
            const xv = xScale(g.cohens_d);
            const positive = g.cohens_d >= 0;
            return (
              <g key={g.symbol}>
                <rect
                  x={Math.min(x0, xv)}
                  y={y}
                  width={Math.abs(xv - x0)}
                  height={bh}
                  fill={positive ? COLOR_A : COLOR_B}
                  rx={1}
                >
                  <title>{`${g.symbol}: d = ${g.cohens_d.toFixed(2)}`}</title>
                </rect>
                {/* Label sits on the opposite side of the zero line from the bar. */}
                <text
                  x={positive ? x0 - 4 : x0 + 4}
                  y={y + bh / 2}
                  dy="0.35em"
                  fontSize={10}
                  fill="#555"
                  textAnchor={positive ? "end" : "start"}
                >
                  {g.symbol}
                </text>
              </g>
            );
          })}
          <line x1={x0} x2={x0} y1={0} y2={innerH} stroke="#999" />
          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="#ccc"
            tickStroke="#ccc"
            numTicks={5}
            tickLabelProps={{ fontSize: 9, textAnchor: "middle", fill: "#777" }}
          />
        </Group>
      </svg>
    </div>
  );
}

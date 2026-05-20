import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";

export type TopGenesBarDatum = {
  symbol: string;
  mean: number;
  fraction_expressing: number;
};

export type TopGenesBarChartProps = {
  obs_column: string;
  group_value: string;
  genes: TopGenesBarDatum[];
  width?: number;
  rowHeight?: number;
};

const DEFAULT_WIDTH = 280;
const DEFAULT_ROW_HEIGHT = 16;
const MARGIN = { top: 24, right: 8, bottom: 32, left: 64 };
const BAR_COLOR = "#4a90d9";

export default function TopGenesBarChart({
  obs_column,
  group_value,
  genes,
  width = DEFAULT_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
}: TopGenesBarChartProps) {
  if (!genes.length) return null;

  const height = MARGIN.top + MARGIN.bottom + genes.length * rowHeight;
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const maxMean = Math.max(0, ...genes.map((g) => g.mean));
  const xScale = scaleLinear({
    domain: [0, maxMean || 1],
    range: [0, innerW],
    nice: true,
  });
  const yScale = scaleBand<string>({
    domain: genes.map((g) => g.symbol),
    range: [0, innerH],
    padding: 0.2,
  });

  return (
    <div style={{ width, maxWidth: width }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
        Top {genes.length} genes in <b>{group_value}</b>
        <span style={{ color: "#999" }}> ({obs_column})</span>
      </div>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Top ${genes.length} genes in ${group_value}`}
      >
        <Group top={MARGIN.top} left={MARGIN.left}>
          {genes.map((g) => {
            const y = yScale(g.symbol) ?? 0;
            const w = xScale(g.mean);
            const bh = yScale.bandwidth();
            return (
              <rect
                key={g.symbol}
                x={0}
                y={y}
                width={w}
                height={bh}
                fill={BAR_COLOR}
                rx={2}
              >
                <title>{`${g.symbol}: mean=${g.mean.toFixed(2)}, frac_expr=${(g.fraction_expressing * 100).toFixed(0)}%`}</title>
              </rect>
            );
          })}
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
            tickLabelProps={{ fontSize: 9, textAnchor: "middle", fill: "#777" }}
            label="mean expression"
            labelProps={{ fontSize: 10, textAnchor: "middle", fill: "#666" }}
          />
        </Group>
      </svg>
    </div>
  );
}

import { DotPlotMatrix } from "./ExpressionDotPlot";
import type { DotPlotDatum } from "./ExpressionDotPlot";

export type GenePanelDotplotData = {
  obs_column: string;
  genes: string[];
  categories: string[];
  mean: number[][];          // [genes][categories]
  frac_expressing: number[][];
  n_cells_per_category?: number[];
};

export type GenePanelDotplotProps = {
  data: GenePanelDotplotData;
  width?: number;       // default 280 for inline chat
  isModal?: boolean;    // when rendered inside ChartModal
};

const DEFAULT_WIDTH = 280;
// "viridis" is the first key in COLOR_SCALES (viridis, magma, plasma, inferno)
const DEFAULT_COLOR_SCALE = "viridis";

function flatten(data: GenePanelDotplotData): DotPlotDatum[] {
  const rows: DotPlotDatum[] = [];
  for (let gi = 0; gi < data.genes.length; gi++) {
    const sym = data.genes[gi];
    for (let ci = 0; ci < data.categories.length; ci++) {
      rows.push({
        gene: sym,
        geneLabel: sym,
        category: data.categories[ci],
        meanExpression: data.mean[gi]?.[ci] ?? 0,
        fractionExpressing: data.frac_expressing[gi]?.[ci] ?? 0,
      });
    }
  }
  return rows;
}

export default function GenePanelDotplot({
  data,
  width = DEFAULT_WIDTH,
  isModal = false,
}: GenePanelDotplotProps) {
  if (!data.genes.length || !data.categories.length) return null;

  const rows = flatten(data);
  const maxMeanExpression = Math.max(0, ...rows.map((r) => r.meanExpression));
  const genes = data.genes.map((g) => ({ key: g, label: g }));

  return (
    <div style={{ width, maxWidth: width }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
        Expression across <b>{data.obs_column}</b>
      </div>
      <DotPlotMatrix
        data={rows}
        genes={genes}
        categories={data.categories}
        maxMeanExpression={maxMeanExpression}
        colorScaleName={DEFAULT_COLOR_SCALE}
        width={width}
        swapAxes={true}
        isModal={isModal}
      />
    </div>
  );
}

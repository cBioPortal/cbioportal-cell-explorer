import { DotPlotTable } from "./ExpressionDotPlot";
import type { DotPlotDatum } from "./ExpressionDotPlot";
import type { GenePanelDotplotData } from "./GenePanelDotplot";

export type GenePanelDotplotTableProps = {
  data: GenePanelDotplotData;
};

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

export default function GenePanelDotplotTable({ data }: GenePanelDotplotTableProps) {
  if (!data.genes.length || !data.categories.length) return null;
  const rows = flatten(data);
  const genes = data.genes.map((g) => ({ key: g, label: g }));
  return <DotPlotTable data={rows} genes={genes} categories={data.categories} />;
}

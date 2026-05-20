import type { ComponentType } from "react";
import TopGenesBarChart from "../components/TopGenesBarChart";
import GenePanelDotplot from "../components/GenePanelDotplot";
import type { ChartHint } from "./types";

/**
 * A chart renderer takes the `chart.data` payload (renderer-specific) plus
 * a fixed set of layout hints, and renders the chart. The registry maps
 * `chart.type` (a string from the backend) to a renderer.
 *
 * If a chart type is unknown, lookup returns `undefined` and the caller
 * (AssistantBubble) silently omits the inline chart — this is intentional:
 * the backend can introduce new chart types without breaking older clients.
 */
export type ChartRendererProps = {
  data: unknown;
  width?: number;
  isModal?: boolean;
};

export type ChartRenderer = ComponentType<ChartRendererProps>;

// Adapter wrappers normalize the per-renderer prop shapes to the common
// ChartRendererProps interface. Each adapter narrows `data: unknown` to the
// shape that its target component expects.

const TopGenesBarAdapter: ChartRenderer = ({ data, width }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (!d || !Array.isArray(d.genes)) return null;
  return (
    <TopGenesBarChart
      obs_column={d.obs_column ?? ""}
      group_value={d.group_value ?? ""}
      genes={d.genes}
      width={width}
    />
  );
};

const GenePanelDotplotAdapter: ChartRenderer = ({ data, width, isModal }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (!d || !Array.isArray(d.genes) || !Array.isArray(d.categories)) return null;
  return <GenePanelDotplot data={d} width={width} isModal={isModal} />;
};

const REGISTRY: Record<string, ChartRenderer> = {
  top_genes_bar: TopGenesBarAdapter,
  gene_panel_dotplot: GenePanelDotplotAdapter,
};

/** Returns a chart renderer for the given hint, or undefined if unknown. */
export function getChartRenderer(hint: ChartHint | null | undefined): ChartRenderer | undefined {
  if (!hint || typeof hint.type !== "string") return undefined;
  return REGISTRY[hint.type];
}

import { useMemo } from "react";
import { computeDotplotStats } from "../utils/dotplotUtils";

export function useDotplotData(
  dotplotGenes: string[],
  dotplotGeneExpressions: Record<string, Float32Array>,
  dotplotObsData: string[] | null,
) {
  const normalizedObsData = useMemo(() => {
    if (!dotplotObsData) return null;
    return dotplotObsData.map((v) => (v == null ? "NA" : v));
  }, [dotplotObsData]);

  const groups = useMemo(() => {
    if (!normalizedObsData) return [];
    return [...new Set(normalizedObsData)].sort();
  }, [normalizedObsData]);

  const dotplotData = useMemo(
    () => computeDotplotStats(dotplotGenes, dotplotGeneExpressions, normalizedObsData as string[], groups),
    [dotplotGenes, dotplotGeneExpressions, normalizedObsData, groups],
  );

  return { groups, dotplotData };
}

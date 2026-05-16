import { describe, it, expect } from "vitest";
import { ZarrStore } from "./ZarrStore";
import { StrataStore } from "./StrataStore";
import { strataMeans } from "./strataHelpers";

const FIXTURE = `${globalThis.__TEST_BASE_URL__}/strata-tiny.zarr`;

describe("StrataStore integration against strata-tiny.zarr", () => {
  it("reads coarse_cell_type with ground-truth-correct values for cell_type=A", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const coarse = await strata.readCoarse("cell_type");

    // Fixture cells 0..49 with X[i,j] = ((i+1) * (j+1)) % 5
    // cell_type=A covers cells 0..19 (20 cells).
    // For gene 0 (j=0), values are (i+1) % 5 for i in 0..19:
    //   i=0..4 -> 1,2,3,4,0
    //   repeats 4 times in 20 cells -> sum = 4 * (1+2+3+4+0) = 40
    const aIdx = coarse.stratumKeys.findIndex((row) => row[0] === "A");
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(coarse.nCells[aIdx]).toBe(20);

    const geneCount = 10;
    const sumXGene0 = coarse.sumX[aIdx * geneCount + 0];
    expect(sumXGene0).toBeCloseTo(40, 0);  // float16 underlying — exact integer expected after upcast
  });

  it("reads atomic and confirms cell counts sum to 50", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const atomic = await strata.readAtomic();
    const total = Array.from(atomic.nCells).reduce((a, b) => a + b, 0);
    expect(total).toBe(50);
  });

  it("helpers compose against fixture-derived tables", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const coarse = await strata.readCoarse("cell_type");
    const means = strataMeans(coarse);
    // Means are nonzero and finite for at least one stratum/gene
    let anyNonzeroFinite = false;
    for (let i = 0; i < means.length; i++) {
      if (Number.isFinite(means[i]) && means[i] !== 0) anyNonzeroFinite = true;
    }
    expect(anyNonzeroFinite).toBe(true);
  });
});

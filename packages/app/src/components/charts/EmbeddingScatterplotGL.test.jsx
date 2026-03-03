import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Mock deck.gl — it requires WebGL which jsdom doesn't provide
vi.mock("@deck.gl/react", () => ({
  default: vi.fn((props) => <div data-testid="deckgl" />),
}));
vi.mock("@deck.gl/layers", () => ({
  ScatterplotLayer: vi.fn(),
}));
vi.mock("@deck.gl/aggregation-layers", () => ({
  HexagonLayer: vi.fn(),
}));
vi.mock("@deck.gl/core", () => ({
  OrthographicView: vi.fn(),
}));
vi.mock("@deck.gl/widgets", () => ({
  _StatsWidget: vi.fn(),
}));
vi.mock("@probe.gl/stats", () => ({
  Stats: vi.fn(),
}));

// Mock child UI components
vi.mock("../ui/HoverTooltip", () => ({
  default: () => <div data-testid="hover-tooltip" />,
}));
vi.mock("../ui/ExpressionLegend", () => ({
  default: (props) => <div data-testid="expression-legend">{props.selectedGene}</div>,
}));
vi.mock("../ui/CollapsibleLegend", () => ({
  default: () => <div data-testid="collapsible-legend" />,
}));
vi.mock("../ui/SelectionOverlay", () => ({
  default: () => <div data-testid="selection-overlay" />,
}));
vi.mock("../../hooks/useSelectionInteraction", () => ({
  default: () => ({
    selectMode: "pan",
    setSelectMode: vi.fn(),
    selectionRectRef: { current: null },
    lassoSvgRef: { current: null },
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
  }),
}));

const { default: EmbeddingScatterplotGL } = await import(
  "./EmbeddingScatterplotGL"
);

const makePoints = (n) =>
  Array.from({ length: n }, (_, i) => ({
    position: [i, i],
    category: "A",
    colorIndex: 0,
    index: i,
    expression: null,
  }));

const defaultProps = {
  data: new Float32Array([0, 0, 1, 1, 2, 2]),
  shape: [3, 2],
  label: "X_umap",
  points: makePoints(3),
  categoryColorMap: {},
  bounds: { minX: 0, maxX: 2, minY: 0, maxY: 2 },
  expressionRange: null,
  selectedSet: new Set(),
  hexColorConfig: {},
  hexData: makePoints(3),
  sortedCategories: [],
  hasCategories: false,
  hexColorMode: "density",
  colorColumn: null,
  colorData: null,
  selectedGene: null,
  geneExpression: null,
  tooltipData: {},
  metadata: { obsColumns: [] },
  selectedPointIndices: [],
  selectionGeometry: null,
  colorScaleName: "viridis",
  setSelectedPoints: vi.fn(),
  clearSelectedPoints: vi.fn(),
  setSelectionGeometry: vi.fn(),
  setColorScaleName: vi.fn(),
};

describe("EmbeddingScatterplotGL", () => {
  afterEach(cleanup);

  it("renders axis labels from the label prop", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.getByText("X_umap_1")).toBeInTheDocument();
    expect(screen.getByText("X_umap_2")).toBeInTheDocument();
  });

  it("renders rectangle and lasso select buttons", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.getByTitle("Rectangle select")).toBeInTheDocument();
    expect(screen.getByTitle("Lasso select")).toBeInTheDocument();
  });

  it("shows hexbin toggle button when showHexbinToggle is true", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} showHexbinToggle />);
    expect(screen.getByTitle("Switch to hexbin")).toBeInTheDocument();
  });

  it("does not show hexbin toggle button by default", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.queryByTitle("Switch to hexbin")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Switch to scatter")).not.toBeInTheDocument();
  });

  it("shows truncation message when points < total shape", () => {
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        shape={[1000, 2]}
        points={makePoints(3)}
      />,
    );
    expect(screen.getByText(/Showing 3 of 1,000 points/)).toBeInTheDocument();
  });

  it("does not show truncation message when all points are shown", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("shows selection count badge when points are selected", () => {
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        selectedPointIndices={[0, 1]}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("does not show selection count badge when nothing is selected", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("shows expression legend when gene expression is present", () => {
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        selectedGene="TP53"
        geneExpression={new Float32Array([0.1, 0.5, 0.9])}
        expressionRange={{ min: 0.1, max: 0.9 }}
      />,
    );
    expect(screen.getByTestId("expression-legend")).toBeInTheDocument();
  });

  it("does not show expression legend without gene expression", () => {
    render(<EmbeddingScatterplotGL {...defaultProps} />);
    expect(screen.queryByTestId("expression-legend")).not.toBeInTheDocument();
  });

  it("shows collapsible legend when color column has categories", () => {
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        colorColumn="cell_type"
        sortedCategories={[
          ["TypeA", [255, 0, 0]],
          ["TypeB", [0, 255, 0]],
        ]}
      />,
    );
    expect(screen.getByTestId("collapsible-legend")).toBeInTheDocument();
  });

  it("shows gene expression color label in scatter mode", () => {
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        selectedGene="TP53"
        geneExpression={new Float32Array([0.1, 0.5, 0.9])}
        expressionRange={{ min: 0.1, max: 0.9 }}
      />,
    );
    expect(screen.getByText("TP53 expression")).toBeInTheDocument();
  });

  it("shows save selection button when geometry and callback exist", () => {
    const onSave = vi.fn();
    render(
      <EmbeddingScatterplotGL
        {...defaultProps}
        selectedPointIndices={[0]}
        selectionGeometry={{ type: "rectangle", bounds: [0, 0, 1, 1] }}
        onSaveSelection={onSave}
      />,
    );
    expect(screen.getByTitle("Save selection to config")).toBeInTheDocument();
  });
});

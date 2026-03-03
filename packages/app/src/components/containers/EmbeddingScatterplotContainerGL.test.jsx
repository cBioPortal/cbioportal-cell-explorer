import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock the V2 chart component to isolate container logic
vi.mock("../charts/EmbeddingScatterplotGL", () => ({
  default: (props) => (
    <div data-testid="scatterplot-v2">
      <span data-testid="label">{props.label}</span>
      <span data-testid="point-count">{props.points?.length ?? 0}</span>
      <span data-testid="hex-color-mode">{props.hexColorMode}</span>
      <span data-testid="has-categories">{String(props.hasCategories)}</span>
      <span data-testid="selected-count">{props.selectedSet?.size ?? 0}</span>
      <span data-testid="color-scale">{props.colorScaleName}</span>
    </div>
  ),
}));

// Mock the store
const mockSetSelectedPoints = vi.fn();
const mockClearSelectedPoints = vi.fn();
const mockSetSelectionGeometry = vi.fn();
const mockSetColorScaleName = vi.fn();

let storeState = {};

vi.mock("../../store/useAppStore", () => {
  const store = vi.fn(() => storeState);
  store.getState = vi.fn(() => storeState);
  store.setState = vi.fn();
  return { default: store };
});

// Import after mocks
const { default: EmbeddingScatterplotContainerGL } = await import(
  "./EmbeddingScatterplotContainerGL"
);

const baseStoreState = {
  colorColumn: null,
  colorData: null,
  selectedGene: null,
  geneExpression: null,
  tooltipData: {},
  metadata: { obsColumns: [] },
  selectedPointIndices: [],
  setSelectedPoints: mockSetSelectedPoints,
  clearSelectedPoints: mockClearSelectedPoints,
  selectionGeometry: null,
  setSelectionGeometry: mockSetSelectionGeometry,
  colorScaleName: "viridis",
  setColorScaleName: mockSetColorScaleName,
};

const defaultProps = {
  data: new Float32Array([1, 2, 3, 4, 5, 6]),
  shape: [3, 2],
  label: "X_umap",
};

describe("EmbeddingScatterplotContainerGL", () => {
  beforeEach(() => {
    storeState = { ...baseStoreState };
  });

  afterEach(cleanup);

  it("renders the V2 scatterplot with correct label", () => {
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    expect(screen.getByTestId("scatterplot-v2")).toBeInTheDocument();
    expect(screen.getByTestId("label")).toHaveTextContent("X_umap");
  });

  it("builds points from data and passes them through", () => {
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    // 3 points from shape [3, 2]
    expect(screen.getByTestId("point-count")).toHaveTextContent("3");
  });

  it("defaults to density hex color mode with no color data", () => {
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    expect(screen.getByTestId("hex-color-mode")).toHaveTextContent("density");
    expect(screen.getByTestId("has-categories")).toHaveTextContent("false");
  });

  it("switches to expression hex color mode when gene expression is present", () => {
    storeState = {
      ...baseStoreState,
      selectedGene: "TP53",
      geneExpression: new Float32Array([0.1, 0.5, 0.9]),
    };
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    expect(screen.getByTestId("hex-color-mode")).toHaveTextContent("expression");
  });

  it("passes selected point count through", () => {
    storeState = {
      ...baseStoreState,
      selectedPointIndices: [0, 2],
    };
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
  });

  it("passes color scale name from store", () => {
    storeState = {
      ...baseStoreState,
      colorScaleName: "magma",
    };
    render(<EmbeddingScatterplotContainerGL {...defaultProps} />);
    expect(screen.getByTestId("color-scale")).toHaveTextContent("magma");
  });
});

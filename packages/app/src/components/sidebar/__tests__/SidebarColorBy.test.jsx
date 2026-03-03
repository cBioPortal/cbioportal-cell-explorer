import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import useAppStore from "../../../store/useAppStore";
import SidebarColorBy from "../SidebarColorBy";

// Mock VirtualizedList to avoid react-window v2 measurement renders
vi.mock("../VirtualizedList", () => ({
  default: ({ items, selected, onSelect }) => (
    <div data-testid="virtualized-list">
      {items.map((item) => (
        <div key={item} data-item={item} onClick={() => onSelect(item)}>
          {item}
        </div>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  useAppStore.setState({
    metadata: {
      obsColumns: ["cell_type", "batch", "sample_id"],
      geneNames: ["TP53", "BRCA1", "EGFR"],
    },
    colorColumn: null,
    selectedGene: null,
    colorLoading: false,
    setColorColumn: vi.fn(),
    setSelectedGene: vi.fn(),
    clearGeneSelection: vi.fn(),
  });
});

describe("SidebarColorBy", () => {
  it("renders the section label and mode selector", () => {
    render(<SidebarColorBy />);
    expect(screen.getAllByText("Color by").length).toBeGreaterThan(0);
  });

  it("shows columns list by default", () => {
    render(<SidebarColorBy />);
    expect(screen.getAllByText("cell_type").length).toBeGreaterThan(0);
    expect(screen.getAllByText("batch").length).toBeGreaterThan(0);
  });
});

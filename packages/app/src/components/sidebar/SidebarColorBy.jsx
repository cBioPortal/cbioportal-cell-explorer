import { useState, useMemo, useRef, useEffect } from "react";
import { Select, Input } from "antd";
import useAppStore from "../../store/useAppStore";
import VirtualizedList from "./VirtualizedList";

const SEARCH_THRESHOLD = 10;

const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#666",
  textTransform: "uppercase",
};

export default function SidebarColorBy() {
  const {
    metadata,
    colorColumn,
    selectedGene,
    colorLoading,
    setColorColumn,
    setSelectedGene,
    clearGeneSelection,
  } = useAppStore();

  const { obsColumns, geneNames } = metadata;

  const [mode, setMode] = useState("columns");
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef(null);
  const [listHeight, setListHeight] = useState(300);

  const isColumns = mode === "columns";
  const items = isColumns ? obsColumns : geneNames;
  const selected = isColumns ? colorColumn : selectedGene;
  const loading = colorLoading ? selected : null;
  const showSearch = items && items.length > SEARCH_THRESHOLD;

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!searchText) return items;
    const search = searchText.toLowerCase();
    return items.filter((name) => name.toLowerCase().includes(search));
  }, [items, searchText]);

  // Reset search when switching modes
  useEffect(() => {
    setSearchText("");
  }, [mode]);

  // Measure available height for the virtualized list
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setListHeight(entry.contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === "columns") {
      clearGeneSelection();
    } else {
      setColorColumn(null);
    }
  };

  const handleSelect = (item) => {
    if (isColumns) {
      setColorColumn(item);
    } else {
      setSelectedGene(item);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: "12px 16px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={sectionLabelStyle}>Color by</div>
        <Select
          size="small"
          value={mode}
          onChange={handleModeChange}
          style={{ width: 100 }}
          options={[
            { label: "Columns", value: "columns" },
            { label: "Genes", value: "genes" },
          ]}
        />
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ padding: "0 16px 8px" }}>
          <Input.Search
            size="small"
            placeholder={isColumns ? "Search columns..." : "Search genes..."}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>
      )}

      {/* Status bar */}
      {searchText && (
        <div
          style={{
            padding: "0 16px 4px",
            fontSize: 11,
            color: "#999",
          }}
        >
          {filteredItems.length.toLocaleString()} of {items.length.toLocaleString()}
          {" "}{isColumns ? "columns" : "genes"}
        </div>
      )}

      {/* Virtualized list */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
        <VirtualizedList
          items={filteredItems}
          selected={selected}
          onSelect={handleSelect}
          loading={loading}
          height={listHeight}
        />
      </div>
    </div>
  );
}

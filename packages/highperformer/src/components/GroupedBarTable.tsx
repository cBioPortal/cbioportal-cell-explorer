import {
  describeWhere,
  formatGroupedBarValue,
  type GroupedBarData,
} from "./GroupedBarChart";

const TH: React.CSSProperties = {
  textAlign: "left",
  fontWeight: 600,
  padding: "4px 8px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 12,
};

const TH_NUM: React.CSSProperties = { ...TH, textAlign: "right" };
const TD: React.CSSProperties = { padding: "2px 8px", fontSize: 12 };
const TD_NUM: React.CSSProperties = { ...TD, textAlign: "right" };

export default function GroupedBarTable({ data }: { data: GroupedBarData }) {
  const { categories, series, values, value_kind } = data;
  if (!categories.length) return null;
  const whereText = describeWhere(data.where);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        {data.title}
        {whereText && <span style={{ color: "#999" }}> — {whereText}</span>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH} />
            {series.map((s) => (
              <th key={s} style={TH_NUM}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c}>
              <td style={TD}>{c}</td>
              {series.map((s, j) => (
                <td key={s} style={TD_NUM}>
                  {Number.isFinite(values[i]?.[j])
                    ? formatGroupedBarValue(values[i][j], value_kind)
                    : "—"}
                </td>
              ))}
            </tr>
          ))}
          {series.length > 1 && data.n_cells?.length === series.length && (
            <tr>
              <td style={{ ...TD, color: "#999" }}>Cells</td>
              {data.n_cells.map((n, j) => (
                <td key={series[j]} style={{ ...TD_NUM, color: "#999" }}>
                  {n.toLocaleString()}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

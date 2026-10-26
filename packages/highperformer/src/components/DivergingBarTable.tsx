import { sortByEffect, type DivergingBarData } from "./DivergingBarChart";

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

export default function DivergingBarTable({ data }: { data: DivergingBarData }) {
  const genes = sortByEffect(data.genes);
  if (!genes.length) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        <b>{data.group_a}</b> vs <b>{data.group_b}</b>
        <span style={{ color: "#999" }}> ({data.obs_column})</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>Gene</th>
            <th style={TH_NUM}>Cohen's d</th>
            <th style={TH}>Higher in</th>
          </tr>
        </thead>
        <tbody>
          {genes.map((g) => (
            <tr key={g.symbol}>
              <td style={TD}>{g.symbol}</td>
              <td style={TD_NUM}>{g.cohens_d.toFixed(3)}</td>
              <td style={TD}>{g.cohens_d >= 0 ? data.group_a : data.group_b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

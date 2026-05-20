import type { TopGenesBarDatum } from "./TopGenesBarChart";

export type TopGenesBarTableProps = {
  obs_column: string;
  group_value: string;
  genes: TopGenesBarDatum[];
};

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

export default function TopGenesBarTable({ obs_column, group_value, genes }: TopGenesBarTableProps) {
  if (!genes.length) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        Top {genes.length} genes in <b>{group_value}</b>
        <span style={{ color: "#999" }}> ({obs_column})</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={TH}>Rank</th>
            <th style={TH}>Gene</th>
            <th style={TH_NUM}>Mean</th>
            <th style={TH_NUM}>% Expressing</th>
          </tr>
        </thead>
        <tbody>
          {genes.map((g, i) => (
            <tr key={g.symbol}>
              <td style={{ ...TD, color: "#999" }}>{i + 1}</td>
              <td style={TD}>{g.symbol}</td>
              <td style={TD_NUM}>{g.mean.toFixed(3)}</td>
              <td style={TD_NUM}>{(g.fraction_expressing * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

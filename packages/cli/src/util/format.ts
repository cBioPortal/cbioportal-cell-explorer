export function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return n.toLocaleString("en-US");
  }
  if (Math.abs(n) < 0.001 && n !== 0) {
    return n.toExponential(2);
  }
  return n.toFixed(4);
}

export function printTable(
  headers: string[],
  rows: (string | number)[][],
): void {
  const formatted = rows.map((row) =>
    row.map((cell) => (typeof cell === "number" ? formatNumber(cell) : String(cell)))
  );

  const widths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...formatted.map((row) => (row[i] ?? "").length),
    )
  );

  const pad = (s: string, w: number, alignRight: boolean) =>
    alignRight ? s.padStart(w) : s.padEnd(w);

  // Detect numeric columns from the first data row
  const numeric = headers.map((_, i) =>
    rows.length > 0 && typeof rows[0][i] === "number"
  );

  const headerLine = headers
    .map((h, i) => pad(h, widths[i], numeric[i]))
    .join("  ");
  const separator = widths.map((w) => "\u2500".repeat(w)).join("\u2500\u2500");

  console.log(headerLine);
  console.log(separator);
  for (const row of formatted) {
    console.log(
      row.map((cell, i) => pad(cell, widths[i], numeric[i])).join("  "),
    );
  }
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

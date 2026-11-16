/** Left-aligned columns separated by two spaces, for terminal output. */
export function format_table(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? "").length)),
  );
  const format_row = (row: string[]): string =>
    row
      .map((cell, column) => (column === row.length - 1 ? cell : cell.padEnd(widths[column] ?? 0)))
      .join("  ")
      .trimEnd();
  return [headers, ...rows].map(format_row).join("\n");
}

/** Célula de CSV segura para Excel/Sheets: fórmulas ganham apóstrofo e o resto é citado. */
export function cell(v: string): string {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Corpo do CSV com BOM (abre com acentos no Excel) e quebras \r\n. */
export function csvBody(rows: string[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

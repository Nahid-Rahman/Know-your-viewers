// Cells starting with these characters are interpreted as formulas by Excel,
// LibreOffice and Google Sheets — prefix them with an apostrophe so
// participant-entered text can't execute as a formula (CSV injection).
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = Array.isArray(value) ? value.join("; ") : value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === "string" && FORMULA_PREFIX.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvValue).join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))];
  return lines.join("\n");
}

/** `lines[i]` is the file line where `rows[i]` starts (1-based), for error messages. */
export type CsvParseResult = { ok: true; rows: string[][]; lines: number[] } | { ok: false; error: string; line: number };

/**
 * RFC 4180 parser: quoted fields may contain commas, CR/LF line breaks and
 * doubled quotes (""). Accepts LF or CRLF row endings and strips a leading
 * UTF-8 BOM. Fails (with the line number) on an unterminated quote or text
 * after a closing quote, instead of guessing. Fully blank lines are dropped.
 */
export function parseCsv(input: string): CsvParseResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  const lines: number[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowStartLine = 1;
  const endRow = () => {
    row.push(field);
    if (!(row.length === 1 && row[0].trim() === "")) {
      rows.push(row);
      lines.push(rowStartLine);
    }
    row = [];
    field = "";
    afterQuote = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        if (c === "\n") line++;
        field += c;
      }
      continue;
    }
    if (c === '"') {
      if (field !== "" || afterQuote) return { ok: false, error: "A quote appears inside an unquoted field.", line };
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      afterQuote = false;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
      rowStartLine = line;
    } else {
      if (afterQuote) return { ok: false, error: "Unexpected text after a closing quote.", line };
      field += c;
    }
  }
  if (quoted) return { ok: false, error: "A quoted field is never closed.", line: rowStartLine };
  if (field !== "" || row.length) endRow();
  return { ok: true, rows, lines };
}

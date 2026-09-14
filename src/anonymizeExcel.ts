/**
 * Simple Excel anonymizer utility.
 *
 * - Finds a column whose header name contains both "long" and "description" (case-insensitive),
 *   or matches an override column name passed in options.
 * - For each cell in that column it applies anonymization rules:
 *   - replace every digit with '*'
 *   - replace whole-word 'Af' (case-insensitive) with '*'
 *   - if the cell contains JSON, will parse and recursively anonymize numeric values
 *
 * Usage (after installing deps):
 *   npm install
 *   npx tsx src/anonymizeExcel.ts input.xlsx output.xlsx
 *
 * You can also import and use `anonymizeFile` programmatically.
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

type Options = {
  columnNameOverride?: string; // exact header name to use instead of auto-detect
};

function normalizeHeader(h?: string) {
  return (h ?? "").toString().trim().toLowerCase();
}

function findLongDescriptionColumn(headers: string[], override?: string): number | null {
  if (override) {
    const idx = headers.findIndex((h) => normalizeHeader(h) === normalizeHeader(override));
    return idx >= 0 ? idx : null;
  }

  for (let i = 0; i < headers.length; i++) {
    const n = normalizeHeader(headers[i]);
    if (n.includes("long") && n.includes("description")) return i;
    if (n === "long_description" || n === "longdescription" || n === "longdesc") return i;
  }
  return null;
}

function anonymizeStringCell(s: string): string {
  // Try to detect JSON and anonymize nested values
  const trimmed = s.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      const parsed = JSON.parse(trimmed);
      const anonymized = anonymizeJson(parsed);
      return JSON.stringify(anonymized);
    } catch (e) {
      // fallthrough to plain string anonymization
    }
  }

  // Replace digits with '*'
  let out = s.replace(/\d/g, "*");
  // Replace whole-word 'Af' (case-insensitive) with '*'
  out = out.replace(/\bAf\b/gi, "*");
  return out;
}

function anonymizeJson(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(anonymizeJson);
  if (typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) {
      // If a key is 'Af' (case-insensitive), set its value to '*'
      if (k.toLowerCase() === "af") {
        out[k] = "*";
        continue;
      }
      out[k] = anonymizeJson(value[k]);
    }
    return out;
  }
  if (typeof value === "number") return "*";
  if (typeof value === "string") return anonymizeStringCell(value);
  return value;
}

export function anonymizeFile(inputPath: string, outputPath?: string, options?: Options) {
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${inputPath}`);
  const workbook = XLSX.readFile(inputPath, { cellDates: true });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:A1");

    // Read the first row as headers
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = { c: C, r: range.s.r };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = sheet[cellRef];
      headers.push(cell ? String(cell.v) : "");
    }

    const colIndex = findLongDescriptionColumn(headers, options?.columnNameOverride);
    if (colIndex === null) continue; // no column found on this sheet

    // Anonymize every cell in that column starting from row after header
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: R });
      const cell = sheet[cellRef];
      if (!cell) continue;
      const original = cell.v;
      let newVal: any = original;
      if (typeof original === "number") {
        newVal = "*";
      } else if (typeof original === "string") {
        newVal = anonymizeStringCell(original);
      } else {
        // other types: try stringify then anonymize
        try {
          const s = JSON.stringify(original);
          newVal = anonymizeStringCell(s);
        } catch (e) {
          newVal = original;
        }
      }
      // Replace cell value
      sheet[cellRef].v = newVal;
      // ensure the cell type is string after anonymization
      sheet[cellRef].t = "s";
    }
  }

  const outPath = outputPath ?? path.join(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + "-anonymized" + path.extname(inputPath));
  XLSX.writeFile(workbook, outPath);
  return outPath;
}

// CLI
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error("Usage: tsx src/anonymizeExcel.ts <input.xlsx> [output.xlsx] [--column " +
      "ColumnName]");
    process.exit(2);
  }
  const input = argv[0];
  let output: string | undefined;
  let override: string | undefined;
  if (argv[1] && !argv[1].startsWith("--")) output = argv[1];
  const colArgIndex = argv.findIndex((a) => a === "--column");
  if (colArgIndex >= 0 && argv[colArgIndex + 1]) override = argv[colArgIndex + 1];

  try {
    const out = anonymizeFile(input, output, { columnNameOverride: override });
    console.log(`Wrote anonymized workbook to: ${out}`);
  } catch (err: any) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

import * as path from "path";
import * as fs from "fs";
import * as XLSX from "xlsx";

const csvPath = path.join(__dirname, "..", "testData", "test-data.csv");
const outPath = path.join(__dirname, "..", "testData", "test-data.xlsx");

if (!fs.existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, { encoding: "utf8" });
const ws = XLSX.utils.aoa_to_sheet(XLSX.utils.sheet_to_json(XLSX.read(csv, { type: 'string' }).Sheets.Sheet1, { header: 1 }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, outPath);

console.log(`Wrote example XLSX to: ${outPath}`);

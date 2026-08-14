import fs from "fs";
import path from "path";
import Papa from "papaparse";
import * as yaml from "js-yaml";
import { getConfig } from "./config";

export interface CsvColumnMeta {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "formula";
  formula?: string;
  format?: string;
  width?: number;
}

export interface CsvMeta {
  sheet: string;
  description?: string;
  columns: CsvColumnMeta[];
}

export interface CsvFile {
  filename: string;
  meta: CsvMeta | null;
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Find all CSV files in a directory (relative to dataDir).
 */
export function listCsvFiles(relativePath: string): string[] {
  const config = getConfig();
  const absDir = path.resolve(config.dataDir, relativePath);
  if (!fs.existsSync(absDir)) return [];

  return fs.readdirSync(absDir).filter((f) => f.endsWith(".csv"));
}

/**
 * Load a CSV file + its optional .meta.yaml sidecar.
 */
export function loadCsvFile(relativePath: string): CsvFile {
  const config = getConfig();
  const absPath = path.resolve(config.dataDir, relativePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`CSV file not found: ${relativePath}`);
  }

  // Security: ensure path stays within dataDir
  const baseDir = path.resolve(config.dataDir);
  if (!absPath.startsWith(baseDir + path.sep) && absPath !== baseDir) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  const raw = fs.readFileSync(absPath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Keep all as strings, let UI handle types
  });

  // Load meta sidecar if it exists
  const metaPath = absPath.replace(/\.csv$/, ".meta.yaml");
  let meta: CsvMeta | null = null;
  if (fs.existsSync(metaPath)) {
    const metaRaw = fs.readFileSync(metaPath, "utf-8");
    meta = yaml.load(metaRaw) as CsvMeta;
  }

  return {
    filename: path.basename(relativePath),
    meta,
    headers: parsed.meta.fields || [],
    rows: parsed.data,
  };
}

/**
 * Save CSV data back to file (only raw data, no computed columns).
 */
export function saveCsvFile(relativePath: string, rows: Record<string, string>[]): void {
  const config = getConfig();
  const absPath = path.resolve(config.dataDir, relativePath);

  // Security: ensure path stays within dataDir
  const baseDir = path.resolve(config.dataDir);
  if (!absPath.startsWith(baseDir + path.sep) && absPath !== baseDir) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  // Load meta to determine which columns are formula (should not be saved)
  const metaPath = absPath.replace(/\.csv$/, ".meta.yaml");
  let formulaColumns: Set<string> = new Set();
  if (fs.existsSync(metaPath)) {
    const metaRaw = fs.readFileSync(metaPath, "utf-8");
    const meta = yaml.load(metaRaw) as CsvMeta;
    formulaColumns = new Set(
      meta.columns.filter((c) => c.type === "formula").map((c) => c.id)
    );
  }

  // Strip formula columns from rows before saving
  const cleanRows = rows.map((row) => {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!formulaColumns.has(key)) {
        clean[key] = value;
      }
    }
    return clean;
  });

  const csv = Papa.unparse(cleanRows);
  fs.writeFileSync(absPath, csv + "\n", "utf-8");
}

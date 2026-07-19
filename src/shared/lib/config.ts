import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

import type { FieldOption } from "./field-options";

export type { FieldOption } from "./field-options";
export { normalizeOptions, getOptionColor } from "./field-options";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  options?: (string | FieldOption)[];
  aliases?: string[];
}

export interface FolderDef {
  id: string;
  label: string;
  path: string;
  icon: string;
  idPattern?: string;
  fields: FieldDef[];
}

export interface Config {
  dataDir: string;
  folders: FolderDef[];
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const configPath = path.join(process.cwd(), ".config", "itsm.yaml");
  const raw = fs.readFileSync(configPath, "utf-8");
  cachedConfig = yaml.load(raw) as Config;
  return cachedConfig;
}

export function getFolderDef(folderId: string): FolderDef | undefined {
  const config = getConfig();
  return config.folders.find((f) => f.id === folderId);
}

export function getAbsolutePath(relativePath: string): string {
  const config = getConfig();
  const baseDir = path.resolve(config.dataDir);
  // nosemgrep: path-join-resolve-traversal — validated below with startsWith check
  const resolved = path.resolve(baseDir, relativePath);

  // Prevent path traversal: resolved path must stay within baseDir
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolved;
}

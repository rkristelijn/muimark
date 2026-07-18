import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  options?: string[];
  aliases?: string[];
}

export interface FolderDef {
  id: string;
  label: string;
  path: string;
  icon: string;
  fields: FieldDef[];
}

export interface Config {
  dataDir: string;
  folders: FolderDef[];
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const configPath = path.join(process.cwd(), "itsm.config.yaml");
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
  return path.join(config.dataDir, relativePath);
}

// @feature F-005 Config discovery — load .muimark.yaml or .config/itsm.yaml
// @feature F-006 Folder discovery — auto-discover folders when no config exists
import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import type { Config, FolderDef, TreeNode } from "./schema";
import { discoverTree, treeToFolders } from "./discovery";

let cachedConfig: Config | null = null;

/**
 * Resolve the data directory. Priority:
 * 1. MUIMARK_DATA_DIR env var
 * 2. dataDir from .muimark.yaml in CWD
 * 3. CWD itself
 */
function resolveDataDir(): string {
  if (process.env.MUIMARK_DATA_DIR) {
    return path.resolve(process.env.MUIMARK_DATA_DIR);
  }

  const yamlPath = findConfigFile();
  if (yamlPath) {
    const raw = fs.readFileSync(yamlPath, "utf-8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    if (parsed?.dataDir && typeof parsed.dataDir === "string") {
      return path.resolve(parsed.dataDir);
    }
  }

  // Legacy support: .config/itsm.yaml
  const legacyPath = path.join(process.cwd(), ".config", "itsm.yaml");
  if (fs.existsSync(legacyPath)) {
    const raw = fs.readFileSync(legacyPath, "utf-8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    if (parsed?.dataDir && typeof parsed.dataDir === "string") {
      return path.resolve(parsed.dataDir);
    }
  }

  return process.cwd();
}

/**
 * Find config file. Checks (in order):
 * 1. .muimark.yaml in CWD
 * 2. .config/itsm.yaml in CWD (legacy)
 */
function findConfigFile(): string | null {
  const candidates = [
    path.join(process.cwd(), ".muimark.yaml"),
    path.join(process.cwd(), ".config", "itsm.yaml"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Load configured folders from yaml, merging with discovered tree.
 */
function loadConfiguredFolders(configPath: string, dataDir: string): { folders: FolderDef[]; tree: TreeNode[] } {
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;

  const tree = discoverTree(dataDir);

  if (parsed?.folders && Array.isArray(parsed.folders)) {
    const configuredFolders = parsed.folders as FolderDef[];
    const configuredPaths = new Set(configuredFolders.map((f) => f.path));
    const discoveredFolders = treeToFolders(tree).filter((f) => !configuredPaths.has(f.path));

    return {
      folders: [...configuredFolders, ...discoveredFolders],
      tree,
    };
  }

  return { folders: treeToFolders(tree), tree };
}

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const dataDir = resolveDataDir();

  const dataDirConfig = path.join(dataDir, ".muimark.yaml");
  const configPath = fs.existsSync(dataDirConfig) ? dataDirConfig : findConfigFile();

  let folders: FolderDef[];
  let tree: TreeNode[];

  if (configPath) {
    const result = loadConfiguredFolders(configPath, dataDir);
    folders = result.folders;
    tree = result.tree;
  } else {
    tree = discoverTree(dataDir);
    folders = treeToFolders(tree);
  }

  cachedConfig = { dataDir, folders, tree };
  return cachedConfig;
}

export function getFolderDef(folderId: string): FolderDef | undefined {
  const config = getConfig();
  return config.folders.find((f) => f.id === folderId || f.path === folderId.replace(/--/g, "/"));
}

export function getAbsolutePath(relativePath: string): string {
  const config = getConfig();
  const baseDir = path.resolve(config.dataDir);
  const resolved = path.resolve(baseDir, relativePath);

  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolved;
}

export function getTree(): TreeNode[] {
  return getConfig().tree;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

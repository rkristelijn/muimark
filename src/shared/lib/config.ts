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

export interface TreeNode {
  name: string;
  path: string;       // relative path from dataDir
  children: TreeNode[];
  hasMarkdown: boolean;
}

export interface Config {
  dataDir: string;
  folders: FolderDef[];
  tree: TreeNode[];
}

// Directories to always skip during discovery
const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", ".cache", ".tmp",
  "dist", "build", "out", "coverage", "__pycache__",
  ".vscode", ".idea", ".kiro",
]);

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

  // Check for .muimark.yaml in CWD
  const yamlPath = findConfigFile();
  if (yamlPath) {
    const raw = fs.readFileSync(yamlPath, "utf-8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    if (parsed?.dataDir && typeof parsed.dataDir === "string") {
      return path.resolve(parsed.dataDir);
    }
  }

  // Also support legacy .config/itsm.yaml
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
 * 1. .muimark.yaml in dataDir
 * 2. .muimark.yaml in CWD
 * 3. .config/itsm.yaml in CWD (legacy)
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
 * Recursively discover the directory tree, noting which dirs contain .md files.
 */
function discoverTree(baseDir: string, relativePath: string = ""): TreeNode[] {
  const absPath = relativePath ? path.join(baseDir, relativePath) : baseDir;
  if (!fs.existsSync(absPath)) return [];

  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;

    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childAbs = path.join(baseDir, childRelative);

    // Check if this dir has markdown files
    const childEntries = fs.readdirSync(childAbs, { withFileTypes: true });
    const hasMarkdown = childEntries.some((e) => e.isFile() && e.name.endsWith(".md"));

    // Recurse into subdirectories
    const children = discoverTree(baseDir, childRelative);

    // Only include if this dir has markdown or has children with markdown
    if (hasMarkdown || children.length > 0) {
      nodes.push({
        name: entry.name,
        path: childRelative,
        children,
        hasMarkdown,
      });
    }
  }

  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Flatten the tree into FolderDef entries for backward compatibility.
 * Only folders that directly contain .md files become a FolderDef.
 */
function treeToFolders(nodes: TreeNode[]): FolderDef[] {
  const folders: FolderDef[] = [];

  function walk(node: TreeNode) {
    if (node.hasMarkdown) {
      folders.push({
        id: node.path.replace(/\//g, "--"),  // encode path as id
        label: formatLabel(node.name),
        path: node.path,
        icon: "menu_book",
        fields: [],
      });
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of nodes) {
    walk(node);
  }

  return folders;
}

/**
 * Format a directory name as a human-readable label.
 * "mental-health" → "Mental health"
 */
function formatLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Load configured folders from yaml, merging with discovered tree.
 */
function loadConfiguredFolders(configPath: string, dataDir: string): { folders: FolderDef[]; tree: TreeNode[] } {
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;

  const tree = discoverTree(dataDir);

  // If yaml has explicit folders, use them (and augment with discovery)
  if (parsed?.folders && Array.isArray(parsed.folders)) {
    const configuredFolders = parsed.folders as FolderDef[];

    // Also discover folders not in the yaml
    const configuredPaths = new Set(configuredFolders.map((f) => f.path));
    const discoveredFolders = treeToFolders(tree).filter((f) => !configuredPaths.has(f.path));

    return {
      folders: [...configuredFolders, ...discoveredFolders],
      tree,
    };
  }

  // No explicit folders in yaml — use discovery only
  return { folders: treeToFolders(tree), tree };
}

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const dataDir = resolveDataDir();

  // Also check for .muimark.yaml inside the dataDir itself
  const dataDirConfig = path.join(dataDir, ".muimark.yaml");
  const configPath = fs.existsSync(dataDirConfig) ? dataDirConfig : findConfigFile();

  let folders: FolderDef[];
  let tree: TreeNode[];

  if (configPath) {
    const result = loadConfiguredFolders(configPath, dataDir);
    folders = result.folders;
    tree = result.tree;
  } else {
    // Pure auto-discovery
    tree = discoverTree(dataDir);
    folders = treeToFolders(tree);
  }

  cachedConfig = { dataDir, folders, tree };
  return cachedConfig;
}

export function getFolderDef(folderId: string): FolderDef | undefined {
  const config = getConfig();
  // Support both encoded id (mental-health--burnout) and direct path (mental-health/burnout)
  return config.folders.find((f) => f.id === folderId || f.path === folderId.replace(/--/g, "/"));
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

/**
 * Get the full directory tree for the sidebar.
 */
export function getTree(): TreeNode[] {
  return getConfig().tree;
}

/**
 * Clear cached config (useful for tests or hot-reload).
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

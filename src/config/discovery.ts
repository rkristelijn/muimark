import fs from "fs";
import path from "path";
import type { TreeNode, FolderDef } from "./schema";

/** Directories to always skip during discovery */
const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", ".cache", ".tmp",
  "dist", "build", "out", "coverage", "__pycache__",
  ".vscode", ".idea", ".kiro",
]);

/**
 * Recursively discover the directory tree, noting which dirs contain .md files.
 */
export function discoverTree(baseDir: string, relativePath: string = ""): TreeNode[] {
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

    const childEntries = fs.readdirSync(childAbs, { withFileTypes: true });
    const hasMarkdown = childEntries.some((e) => e.isFile() && e.name.endsWith(".md"));

    const children = discoverTree(baseDir, childRelative);

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
export function treeToFolders(nodes: TreeNode[]): FolderDef[] {
  const folders: FolderDef[] = [];

  function walk(node: TreeNode) {
    if (node.hasMarkdown) {
      folders.push({
        id: node.path.replace(/\//g, "--"),
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
 */
export function formatLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

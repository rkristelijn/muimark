import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getConfig, getFolderDef, getAbsolutePath } from "./config";
import type { FolderDef } from "./config";

/**
 * Validate that a filename is safe (no path separators or traversal)
 */
function sanitizeFilename(name: string): string {
  const sanitized = path.basename(name);
  if (sanitized !== name || name.includes("..")) {
    throw new Error(`Invalid filename: ${name}`);
  }
  return sanitized;
}

export interface FileEntry {
  id: string;
  filename: string;
  title: string;
  frontmatter: Record<string, unknown>;
}

export interface FileDetail extends FileEntry {
  content: string;
  raw: string;
}

/**
 * Resolve field aliases in metadata to canonical names.
 * E.g. "datum" → "date" if aliases: [datum] is configured.
 */
function resolveAliases(meta: Record<string, unknown>, folder: FolderDef): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...meta };
  for (const field of folder.fields) {
    if (resolved[field.name]) continue; // already has canonical name
    if (field.aliases) {
      for (const alias of field.aliases) {
        if (resolved[alias]) {
          resolved[field.name] = resolved[alias];
          break;
        }
      }
    }
  }
  return resolved;
}

/**
 * Extract metadata from markdown body when frontmatter is empty.
 * Parses patterns like: **Status:** Resolved
 */
function extractInlineMetadata(content: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const pattern = /\*\*(\w[\w\s]*?):\*\*\s*(.+)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const rawKey = match[1];
    const rawValue = match[2];
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    const value = rawValue.trim();
    meta[key] = value;
  }
  return meta;
}

/**
 * List all markdown files in a folder with their frontmatter
 */
export function listFiles(folderId: string): FileEntry[] {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const dirPath = getAbsolutePath(folder.path);
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));

  return files.map((filename) => {
    // nosemgrep: path-join-resolve-traversal — filename from fs.readdirSync, not user input
    const filePath = path.join(dirPath, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    // If frontmatter is empty, extract from body
    const rawMeta = Object.keys(data).length > 0
      ? data
      : extractInlineMetadata(content);
    const frontmatter = resolveAliases(rawMeta, folder);

    // Extract title from first H1 or filename
    const titleMatch = content.match(/^#\s+(.+)$/m);
    let title = (frontmatter.title as string) || titleMatch?.[1] || filename.replace(".md", "");

    // Strip ID prefix from title if present (e.g. "I-001: Title" → "Title")
    const id = filename.replace(".md", "");
    const idPrefix = `${id}: `;
    if (title.startsWith(idPrefix)) {
      title = title.slice(idPrefix.length);
    }

    return {
      id,
      filename,
      title,
      frontmatter,
    };
  });
}

/**
 * Get a single file with full content
 */
export function getFile(folderId: string, fileId: string): FileDetail | null {
  const folder = getFolderDef(folderId);
  if (!folder) return null;

  const filePath = path.join(getAbsolutePath(folder.path), sanitizeFilename(`${fileId}.md`));
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  // If frontmatter is empty, extract from body
  const rawMeta = Object.keys(data).length > 0
    ? data
    : extractInlineMetadata(content);
  const frontmatter = resolveAliases(rawMeta, folder);

  const titleMatch = content.match(/^#\s+(.+)$/m);
  let title = (frontmatter.title as string) || titleMatch?.[1] || fileId;

  // Strip ID prefix from title
  const idPrefix = `${fileId}: `;
  if (title.startsWith(idPrefix)) {
    title = title.slice(idPrefix.length);
  }

  return {
    id: fileId,
    filename: `${fileId}.md`,
    title,
    frontmatter,
    content,
    raw,
  };
}

/**
 * Save a file (frontmatter + content)
 */
export function saveFile(
  folderId: string,
  fileId: string,
  frontmatter: Record<string, unknown>,
  content: string
): void {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const dirPath = getAbsolutePath(folder.path);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, sanitizeFilename(`${fileId}.md`));
  const output = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, output, "utf-8");
}

/**
 * List all configured folders
 */
export function listFolders(): FolderDef[] {
  return getConfig().folders;
}

/**
 * Generate the next ID for a folder based on existing files.
 * Pattern: prefix-NNN (e.g., I-001, C-012, P-003)
 */
export function getNextId(folderId: string): string {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const prefix = folderId.charAt(0).toUpperCase();
  const dirPath = getAbsolutePath(folder.path);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return `${prefix}-001`;
  }

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
  const numbers = files
    .map((f) => f.replace(".md", ""))
    .map((f) => {
      const match = f.match(/(\d+)/);
      return match?.[1] ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const next = String(max + 1).padStart(3, "0");
  return `${prefix}-${next}`;
}

/**
 * Create a new file in the given folder with auto-generated ID.
 * Returns the created file's ID.
 */
export function createFile(
  folderId: string,
  title: string,
  initialFields?: Record<string, string>
): string {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const id = getNextId(folderId);
  const dirPath = getAbsolutePath(folder.path);
  const filename = `${id}.md`;
  const filePath = path.join(dirPath, filename);

  // Build frontmatter from folder field definitions
  const frontmatter: Record<string, string> = {};
  if (folder.fields) {
    for (const field of folder.fields) {
      const fieldValue = initialFields?.[field.name];
      if (fieldValue) {
        frontmatter[field.name] = fieldValue;
      } else if (field.type === "date" && field.name.match(/date|created/)) {
        frontmatter[field.name] = new Date().toISOString().slice(0, 10);
      } else if (field.type === "select") {
        const defaultOption = field.options?.[0];
        if (defaultOption) frontmatter[field.name] = defaultOption;
      }
    }
  }

  // Build markdown content
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const content = `---\n${fm}\n---\n\n# ${id}: ${title}\n\n`;

  fs.writeFileSync(filePath, content, "utf-8");
  return id;
}

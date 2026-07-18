import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getConfig, getFolderDef, getAbsolutePath } from "./config";
import type { FolderDef } from "./config";

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
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    const value = match[2].trim();
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
    let title = (frontmatter.title as string) || (titleMatch ? titleMatch[1] : filename.replace(".md", ""));

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

  const filePath = path.join(getAbsolutePath(folder.path), `${fileId}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  // If frontmatter is empty, extract from body
  const rawMeta = Object.keys(data).length > 0
    ? data
    : extractInlineMetadata(content);
  const frontmatter = resolveAliases(rawMeta, folder);

  const titleMatch = content.match(/^#\s+(.+)$/m);
  let title = (frontmatter.title as string) || (titleMatch ? titleMatch[1] : fileId);

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

  const filePath = path.join(dirPath, `${fileId}.md`);
  const output = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, output, "utf-8");
}

/**
 * List all configured folders
 */
export function listFolders(): FolderDef[] {
  return getConfig().folders;
}

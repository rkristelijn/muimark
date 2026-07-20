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
  displayId: string;
  filename: string;
  title: string;
  frontmatter: Record<string, unknown>;
  git?: {
    createdAt: string | null;
    createdBy: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  };
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
 * List all markdown files in a folder with their frontmatter.
 * folderId can be an encoded id (e.g. "mental-health--burnout") or a direct path.
 */
export function listFiles(folderId: string): FileEntry[] {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const dirPath = getAbsolutePath(folder.path);
  if (!fs.existsSync(dirPath)) return [];

  let files = fs.readdirSync(dirPath).filter((f) => {
    const fullPath = path.join(dirPath, f);
    return fs.statSync(fullPath).isFile() && f.endsWith(".md");
  });

  // Auto-repair: rename files without ID prefix (only if folder has idPattern)
  if (folder.idPattern) {
    const idRegex = new RegExp(folder.idPattern, "i");
    const needsRepair = files.filter((f) => !idRegex.test(f.replace(".md", "")));

    if (needsRepair.length > 0) {
      // Find the highest existing number
      const allNumbers = files
        .map((f) => f.replace(".md", ""))
        .map((f) => { const m = f.match(/(\d+)/); return m?.[1] ? parseInt(m[1], 10) : 0; })
        .filter((n) => !isNaN(n));
      let nextNum = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;

      // Determine prefix from idPattern (extract letters before \d)
      const prefixMatch = folder.idPattern.match(/\^?\(?([\w-]+?)\\d/);
      const prefix = prefixMatch?.[1]?.replace(/[\\^(]/g, "") || folderId.charAt(0).toUpperCase() + "-";

      for (const filename of needsRepair) {
        const num = String(nextNum).padStart(3, "0");
        const basePart = filename.replace(".md", "");
        const newFilename = `${prefix}${num}-${basePart}.md`;
        const oldPath = path.join(dirPath, filename);
        const newPath = path.join(dirPath, newFilename);
        fs.renameSync(oldPath, newPath);
        nextNum++;
      }

      // Re-read directory after renames
      files = fs.readdirSync(dirPath).filter((f) => {
        const fullPath = path.join(dirPath, f);
        return fs.statSync(fullPath).isFile() && f.endsWith(".md");
      });
    }
  }

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

    // Extract displayId using idPattern regex (case-insensitive), or leave empty
    const basename = filename.replace(".md", "");
    let displayId = "";
    if (folder.idPattern) {
      const idRegex = new RegExp(folder.idPattern, "i");
      const idMatch = basename.match(idRegex);
      if (idMatch?.[1]) {
        displayId = idMatch[1].toUpperCase();
        // Strip ID and common separators from title
        const separators = [`${idMatch[1]}: `, `${idMatch[1]} - `, `${idMatch[1]}-`, `${idMatch[1]} `];
        for (const sep of separators) {
          if (title.toLowerCase().startsWith(sep.toLowerCase())) {
            title = title.slice(sep.length);
            break;
          }
        }
        // Also strip from filename-derived title
        if (title === basename) {
          const rest = basename.slice(idMatch[1].length).replace(/^[-_ ]+/, "");
          if (rest) title = rest.replace(/[-_]/g, " ");
        }
      }
    }

    return {
      id: basename,
      displayId,
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

  // Extract displayId using idPattern (case-insensitive)
  let displayId = "";
  if (folder.idPattern) {
    const idRegex = new RegExp(folder.idPattern, "i");
    const idMatch = fileId.match(idRegex);
    if (idMatch?.[1]) {
      displayId = idMatch[1].toUpperCase();
    }
  }

  // Strip ID prefix from title
  if (displayId) {
    const idPrefix = `${displayId}: `;
    if (title.toUpperCase().startsWith(idPrefix.toUpperCase())) {
      title = title.slice(idPrefix.length);
    }
  }

  return {
    id: fileId,
    displayId,
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
 * List all configured/discovered folders
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
        if (defaultOption) {
          frontmatter[field.name] = typeof defaultOption === "string" ? defaultOption : defaultOption.value;
        }
      }
    }
  }

  // Build markdown content
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const content = fm
    ? `---\n${fm}\n---\n\n# ${id}: ${title}\n\n`
    : `# ${title}\n\n`;

  fs.writeFileSync(filePath, content, "utf-8");
  return id;
}

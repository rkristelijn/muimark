import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getConfig, getFolderDef, getAbsolutePath, clearConfigCache } from "@/config/loader";
import type { FolderDef } from "@/config/schema";
import { today } from "@/logic/time";
import type { DataAdapter, FileEntry, FileDetail, SearchResult } from "./types";

function sanitizeFilename(name: string): string {
  const sanitized = path.basename(name);
  if (sanitized !== name || name.includes("..")) {
    throw new Error(`Invalid filename: ${name}`);
  }
  return sanitized;
}

function resolveAliases(meta: Record<string, unknown>, folder: FolderDef): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...meta };
  for (const field of folder.fields) {
    if (resolved[field.name]) continue;
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

function extractInlineMetadata(content: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const pattern = /\*\*(\w[\w\s]*?):\*\*\s*(.+)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const rawKey = match[1];
    const rawValue = match[2];
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    meta[key] = rawValue.trim();
  }
  return meta;
}

function parseFileEntry(filename: string, dirPath: string, folder: FolderDef): FileEntry {
  const filePath = path.join(dirPath, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const rawMeta = Object.keys(data).length > 0 ? data : extractInlineMetadata(content);
  const frontmatter = resolveAliases(rawMeta, folder);

  const titleMatch = content.match(/^#\s+(.+)$/m);
  let title = (frontmatter.title as string) || titleMatch?.[1] || filename.replace(".md", "");

  const basename = filename.replace(".md", "");
  let displayId = "";
  if (folder.idPattern) {
    const idRegex = new RegExp(folder.idPattern, "i");
    const idMatch = basename.match(idRegex);
    if (idMatch?.[1]) {
      displayId = idMatch[1].toUpperCase();
      const separators = [`${idMatch[1]}: `, `${idMatch[1]} - `, `${idMatch[1]}-`, `${idMatch[1]} `];
      for (const sep of separators) {
        if (title.toLowerCase().startsWith(sep.toLowerCase())) {
          title = title.slice(sep.length);
          break;
        }
      }
      if (title === basename) {
        const rest = basename.slice(idMatch[1].length).replace(/^[-_ ]+/, "");
        if (rest) title = rest.replace(/[-_]/g, " ");
      }
    }
  }

  return { id: basename, displayId, filename, title, frontmatter };
}

function autoRepairFilenames(files: string[], dirPath: string, folder: FolderDef): string[] {
  if (!folder.idPattern) return files;

  const idRegex = new RegExp(folder.idPattern, "i");
  const needsRepair = files.filter((f) => !idRegex.test(f.replace(".md", "")));
  if (needsRepair.length === 0) return files;

  const allNumbers = files
    .map((f) => f.replace(".md", ""))
    .map((f) => { const m = f.match(/(\d+)/); return m?.[1] ? parseInt(m[1], 10) : 0; })
    .filter((n) => !isNaN(n));
  let nextNum = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;

  const prefixMatch = folder.idPattern.match(/\^?\(?([\w-]+?)\\d/);
  const prefix = prefixMatch?.[1]?.replace(/[\\^(]/g, "") || folder.id.charAt(0).toUpperCase() + "-";

  for (const filename of needsRepair) {
    const num = String(nextNum).padStart(3, "0");
    const basePart = filename.replace(".md", "");
    const newFilename = `${prefix}${num}-${basePart}.md`;
    fs.renameSync(path.join(dirPath, filename), path.join(dirPath, newFilename));
    nextNum++;
  }

  return fs.readdirSync(dirPath).filter((f) => {
    const fullPath = path.join(dirPath, f);
    return fs.statSync(fullPath).isFile() && f.endsWith(".md");
  });
}

export const markdownAdapter: DataAdapter = {
  list(folderId: string): FileEntry[] {
    const folder = getFolderDef(folderId);
    if (!folder) throw new Error(`Unknown folder: ${folderId}`);

    const dirPath = getAbsolutePath(folder.path);
    if (!fs.existsSync(dirPath)) return [];

    let files = fs.readdirSync(dirPath).filter((f) => {
      const fullPath = path.join(dirPath, f);
      return fs.statSync(fullPath).isFile() && f.endsWith(".md");
    });

    files = autoRepairFilenames(files, dirPath, folder);
    return files.map((filename) => parseFileEntry(filename, dirPath, folder));
  },

  get(folderId: string, fileId: string): FileDetail | null {
    const folder = getFolderDef(folderId);
    if (!folder) return null;

    const filePath = path.join(getAbsolutePath(folder.path), sanitizeFilename(`${fileId}.md`));
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    const rawMeta = Object.keys(data).length > 0 ? data : extractInlineMetadata(content);
    const frontmatter = resolveAliases(rawMeta, folder);

    const titleMatch = content.match(/^#\s+(.+)$/m);
    let title = (frontmatter.title as string) || titleMatch?.[1] || fileId;

    let displayId = "";
    if (folder.idPattern) {
      const idRegex = new RegExp(folder.idPattern, "i");
      const idMatch = fileId.match(idRegex);
      if (idMatch?.[1]) displayId = idMatch[1].toUpperCase();
    }

    if (displayId) {
      const idPrefix = `${displayId}: `;
      if (title.toUpperCase().startsWith(idPrefix.toUpperCase())) {
        title = title.slice(idPrefix.length);
      }
    }

    return { id: fileId, displayId, filename: `${fileId}.md`, title, frontmatter, content, raw };
  },

  create(folderId: string, title: string, initialFields?: Record<string, string>): string {
    const folder = getFolderDef(folderId);
    if (!folder) throw new Error(`Unknown folder: ${folderId}`);

    const id = this.getNextId(folderId);
    const dirPath = getAbsolutePath(folder.path);
    const filePath = path.join(dirPath, `${id}.md`);

    const frontmatter: Record<string, string> = {};
    if (folder.fields) {
      for (const field of folder.fields) {
        const fieldValue = initialFields?.[field.name];
        if (fieldValue) {
          frontmatter[field.name] = fieldValue;
        } else if (field.type === "date" && field.name.match(/date|created/)) {
          frontmatter[field.name] = today();
        } else if (field.type === "select") {
          const defaultOption = field.options?.[0];
          if (defaultOption) {
            frontmatter[field.name] = typeof defaultOption === "string" ? defaultOption : defaultOption.value;
          }
        }
      }
    }

    const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join("\n");
    const content = fm ? `---\n${fm}\n---\n\n# ${id}: ${title}\n\n` : `# ${title}\n\n`;
    fs.writeFileSync(filePath, content, "utf-8");
    return id;
  },

  save(folderId: string, fileId: string, frontmatter: Record<string, unknown>, content: string): void {
    const folder = getFolderDef(folderId);
    if (!folder) throw new Error(`Unknown folder: ${folderId}`);

    const dirPath = getAbsolutePath(folder.path);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, sanitizeFilename(`${fileId}.md`));
    const output = matter.stringify(content, frontmatter);
    fs.writeFileSync(filePath, output, "utf-8");
  },

  delete(folderId: string, fileId: string): void {
    const folder = getFolderDef(folderId);
    if (!folder) throw new Error(`Unknown folder: ${folderId}`);

    const filePath = path.join(getAbsolutePath(folder.path), sanitizeFilename(`${fileId}.md`));
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${fileId}`);
    fs.unlinkSync(filePath);
  },

  rename(folderId: string, fileId: string, newName: string): string {
    const folder = getFolderDef(folderId);
    if (!folder) throw new Error(`Unknown folder: ${folderId}`);

    const dirPath = getAbsolutePath(folder.path);
    const oldPath = path.join(dirPath, sanitizeFilename(`${fileId}.md`));
    if (!fs.existsSync(oldPath)) throw new Error(`File not found: ${fileId}`);

    const sanitizedName = sanitizeFilename(newName.replace(/\.md$/, ""));
    const newPath = path.join(dirPath, `${sanitizedName}.md`);
    if (fs.existsSync(newPath)) throw new Error(`File already exists: ${sanitizedName}`);

    fs.renameSync(oldPath, newPath);
    return sanitizedName;
  },

  getNextId(folderId: string): string {
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
      .map((f) => { const match = f.match(/(\d+)/); return match?.[1] ? parseInt(match[1], 10) : 0; })
      .filter((n) => !isNaN(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(max + 1).padStart(3, "0")}`;
  },

  search(query: string): SearchResult[] {
    const config = getConfig();
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const folder of config.folders) {
      if (folder.type === "csv") continue;
      try {
        const entries = this.list(folder.id);
        for (const entry of entries) {
          const matchesTitle = entry.title.toLowerCase().includes(lowerQuery);
          const matchesId = entry.displayId.toLowerCase().includes(lowerQuery);
          const matchesMeta = Object.values(entry.frontmatter)
            .some((v) => String(v).toLowerCase().includes(lowerQuery));

          if (matchesTitle || matchesId || matchesMeta) {
            results.push({
              folderId: folder.id,
              folderLabel: folder.label,
              id: entry.id,
              displayId: entry.displayId,
              title: entry.title,
              snippet: matchesTitle ? entry.title : matchesId ? entry.displayId : "",
            });
          }
        }
      } catch { /* skip folders that error */ }
    }

    return results;
  },
};

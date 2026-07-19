import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getConfig, type FolderDef } from "./config";

/**
 * Extract all #ID references from markdown content.
 * Pattern: #X-NNN where X is one or more letters and NNN is one or more digits.
 * Must not be preceded by a word char (to avoid matching inside words).
 */
export function extractReferences(content: string): string[] {
  const regex = /(?<!\w)#([A-Za-z]+-\d+)/g;
  const refs: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      refs.push(match[1].toUpperCase());
    }
  }
  // Deduplicate
  return [...new Set(refs)];
}

/**
 * Resolve a displayId to its folder and file path.
 */
function resolveId(displayId: string): { folder: FolderDef; filePath: string; filename: string } | null {
  const config = getConfig();

  for (const folder of config.folders) {
    if (!folder.idPattern) continue;
    const regex = new RegExp(folder.idPattern, "i");
    if (!regex.test(displayId)) continue;

    const dirPath = path.resolve(config.dataDir, folder.path);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const filename of files) {
      const basename = filename.replace(".md", "");
      const idMatch = basename.match(regex);
      if (idMatch?.[1] && idMatch[1].toUpperCase() === displayId.toUpperCase()) {
        return { folder, filePath: path.join(dirPath, filename), filename };
      }
    }
  }
  return null;
}

/**
 * Update the relations field in a file's frontmatter.
 * Adds the sourceId if not already present.
 */
function addRelation(filePath: string, sourceId: string): void {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const relations: string[] = Array.isArray(data.relations) ? data.relations : [];
  const upperSourceId = sourceId.toUpperCase();

  if (relations.some((r) => r.toUpperCase() === upperSourceId)) {
    return; // Already linked
  }

  relations.push(upperSourceId);
  data.relations = relations;

  const updated = matter.stringify(content, data);
  fs.writeFileSync(filePath, updated, "utf-8");
}

/**
 * Remove a relation from a file's frontmatter.
 */
function removeRelation(filePath: string, targetId: string): void {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (!Array.isArray(data.relations)) return;

  const upperTargetId = targetId.toUpperCase();
  const filtered = data.relations.filter((r: string) => r.toUpperCase() !== upperTargetId);

  if (filtered.length === data.relations.length) return; // Nothing changed

  if (filtered.length === 0) {
    delete data.relations;
  } else {
    data.relations = filtered;
  }

  const updated = matter.stringify(content, data);
  fs.writeFileSync(filePath, updated, "utf-8");
}

/**
 * Index relations for a file after save.
 * Scans the body for #ID references, updates the target's frontmatter,
 * and removes stale reverse links.
 *
 * @param sourceDisplayId - The displayId of the file that was saved (e.g. "I-003")
 * @param content - The markdown body content
 * @param sourcePath - The absolute path to the source file
 */
export function indexRelations(
  sourceDisplayId: string,
  content: string,
  sourcePath: string
): void {
  const newRefs = extractReferences(content);

  // Get current relations from source file to detect removed refs
  const sourceRaw = fs.readFileSync(sourcePath, "utf-8");
  const { data: sourceData } = matter(sourceRaw);
  const currentOutgoing: string[] = Array.isArray(sourceData._outgoingRefs)
    ? sourceData._outgoingRefs
    : [];

  // Determine added and removed refs
  const added = newRefs.filter((r) => !currentOutgoing.includes(r));
  const removed = currentOutgoing.filter((r) => !newRefs.includes(r));

  // Add reverse links for new refs
  for (const ref of added) {
    const target = resolveId(ref);
    if (target && target.filePath !== sourcePath) {
      addRelation(target.filePath, sourceDisplayId);
    }
  }

  // Remove reverse links for removed refs
  for (const ref of removed) {
    const target = resolveId(ref);
    if (target && target.filePath !== sourcePath) {
      removeRelation(target.filePath, sourceDisplayId);
    }
  }

  // Update source file's _outgoingRefs (internal tracking, not displayed)
  if (newRefs.length > 0 || currentOutgoing.length > 0) {
    const raw = fs.readFileSync(sourcePath, "utf-8");
    const { data, content: body } = matter(raw);
    data._outgoingRefs = newRefs.length > 0 ? newRefs : undefined;
    if (!newRefs.length) delete data._outgoingRefs;
    const updated = matter.stringify(body, data);
    fs.writeFileSync(sourcePath, updated, "utf-8");
  }
}

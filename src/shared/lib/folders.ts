import fs from "fs";
import path from "path";
import { getConfig, getFolderDef, getAbsolutePath, clearConfigCache } from "@/config/loader";
import type { FolderDef } from "@/config/schema";

function sanitizeFilename(name: string): string {
  const sanitized = path.basename(name);
  if (sanitized !== name || name.includes("..")) {
    throw new Error(`Invalid filename: ${name}`);
  }
  return sanitized;
}

/** List all configured/discovered folders */
export function listFolders(): FolderDef[] {
  return getConfig().folders;
}

/** Create a new folder (directory) under the dataDir. */
export function createFolder(folderPath: string): string {
  const config = getConfig();
  const baseDir = path.resolve(config.dataDir);
  const sanitizedPath = folderPath.split("/").map((s) => sanitizeFilename(s)).join("/");
  const absPath = path.resolve(baseDir, sanitizedPath);

  if (!absPath.startsWith(baseDir + path.sep) && absPath !== baseDir) {
    throw new Error(`Path traversal detected: ${folderPath}`);
  }

  if (fs.existsSync(absPath)) throw new Error(`Folder already exists: ${folderPath}`);

  fs.mkdirSync(absPath, { recursive: true });
  clearConfigCache();
  return sanitizedPath;
}

/** Delete an empty folder. */
export function deleteFolder(folderId: string): void {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const dirPath = getAbsolutePath(folder.path);
  if (!fs.existsSync(dirPath)) throw new Error(`Folder not found: ${folderId}`);

  const entries = fs.readdirSync(dirPath);
  if (entries.length > 0) throw new Error(`Folder is not empty (${entries.length} items). Delete all files first.`);

  fs.rmdirSync(dirPath);
  clearConfigCache();
}

/** Rename a folder (directory). Returns the new relative path. */
export function renameFolder(folderId: string, newName: string): string {
  const folder = getFolderDef(folderId);
  if (!folder) throw new Error(`Unknown folder: ${folderId}`);

  const config = getConfig();
  const baseDir = path.resolve(config.dataDir);
  const oldPath = getAbsolutePath(folder.path);

  const parentDir = path.dirname(oldPath);
  const sanitizedName = sanitizeFilename(newName);
  const newPath = path.join(parentDir, sanitizedName);

  if (!newPath.startsWith(baseDir + path.sep) && newPath !== baseDir) {
    throw new Error(`Path traversal detected: ${newName}`);
  }

  if (fs.existsSync(newPath)) throw new Error(`Folder already exists: ${newName}`);

  fs.renameSync(oldPath, newPath);
  clearConfigCache();
  return path.relative(baseDir, newPath);
}

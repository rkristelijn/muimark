import { execSync } from "child_process";
import path from "path";
import { getConfig } from "./config";

export interface GitMeta {
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Get git metadata for a file (first and last commit info)
 */
export function getGitMeta(relativePath: string): GitMeta {
  const config = getConfig();
  const filePath = path.join(config.dataDir, relativePath);
  const cwd = config.dataDir;

  try {
    const lastLog = execSync(
      `git log -1 --format="%aI|%aN" -- "${filePath}"`,
      { cwd, encoding: "utf-8", timeout: 5000 }
    ).trim();

    const firstLog = execSync(
      `git log --follow --diff-filter=A --format="%aI|%aN" -- "${filePath}"`,
      { cwd, encoding: "utf-8", timeout: 5000 }
    ).trim();

    const [updatedAt, updatedBy] = lastLog.split("|");
    const firstLine = firstLog.split("\n").pop() || "";
    const [createdAt, createdBy] = firstLine.split("|");

    return {
      createdAt: createdAt || null,
      createdBy: createdBy || null,
      updatedAt: updatedAt || null,
      updatedBy: updatedBy || null,
    };
  } catch {
    return { createdAt: null, createdBy: null, updatedAt: null, updatedBy: null };
  }
}

/**
 * Batch: get updatedAt for all files in a directory (one git command)
 */
export function getGitMetaBatch(folderPath: string, filenames: string[]): Record<string, GitMeta> {
  const config = getConfig();
  const cwd = config.dataDir;
  const dirPath = path.join(config.dataDir, folderPath);
  const result: Record<string, GitMeta> = {};

  try {
    // Get last commit for each file in one call
    const log = execSync(
      `git log --name-only --format="%aI|%aN" -- "${dirPath}"`,
      { cwd, encoding: "utf-8", timeout: 10000, maxBuffer: 1024 * 1024 }
    );

    // Parse: alternating lines of "date|author" and filenames
    const lines = log.split("\n");
    let currentDate = "";
    let currentAuthor = "";

    for (const line of lines) {
      if (line.includes("|")) {
        const [d, a] = line.split("|");
        currentDate = d || "";
        currentAuthor = a || "";
      } else if (line.trim()) {
        const filename = path.basename(line.trim());
        if (filenames.includes(filename) && !result[filename]) {
          // First occurrence = most recent (git log is reverse chronological)
          result[filename] = {
            createdAt: null,
            createdBy: null,
            updatedAt: currentDate,
            updatedBy: currentAuthor,
          };
        }
      }
    }
  } catch {
    // Git not available or not a git repo
  }

  // Fill missing entries
  for (const f of filenames) {
    if (!result[f]) {
      result[f] = { createdAt: null, createdBy: null, updatedAt: null, updatedBy: null };
    }
  }

  return result;
}

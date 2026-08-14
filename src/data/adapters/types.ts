/**
 * DataAdapter interface — the contract between Logic and Data layers.
 *
 * Each storage backend (markdown, csv, sqlite) implements this interface.
 * The Logic layer never touches the filesystem directly.
 */

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

export interface ListOptions {
  sort?: { field: string; dir: "asc" | "desc" };
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  folderId: string;
  folderLabel: string;
  id: string;
  displayId: string;
  title: string;
  snippet: string;
}

export interface DataAdapter {
  /** List all records in a collection */
  list(folderId: string, opts?: ListOptions): FileEntry[];

  /** Get a single record with full content */
  get(folderId: string, fileId: string): FileDetail | null;

  /** Create a new record, returns the generated ID */
  create(folderId: string, title: string, fields?: Record<string, string>): string;

  /** Save/update a record's frontmatter and content */
  save(folderId: string, fileId: string, frontmatter: Record<string, unknown>, content: string): void;

  /** Delete a record */
  delete(folderId: string, fileId: string): void;

  /** Rename a record, returns new ID */
  rename(folderId: string, fileId: string, newName: string): string;

  /** Get the next auto-generated ID for a folder */
  getNextId(folderId: string): string;

  /** Search across all folders */
  search(query: string): SearchResult[];
}

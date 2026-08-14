/**
 * Re-export from MarkdownAdapter for backward compatibility.
 * API routes should gradually migrate to importing from @/data/adapters/ directly.
 */
import { markdownAdapter } from "@/data/adapters/markdown";

// Re-export types from adapter
export type { FileEntry, FileDetail } from "@/data/adapters/types";

// Delegate all functions to the adapter
export const listFiles = markdownAdapter.list.bind(markdownAdapter);
export const getFile = markdownAdapter.get.bind(markdownAdapter);
export const createFile = markdownAdapter.create.bind(markdownAdapter);
export const saveFile = markdownAdapter.save.bind(markdownAdapter);
export const deleteFile = markdownAdapter.delete.bind(markdownAdapter);
export const renameFile = markdownAdapter.rename.bind(markdownAdapter);
export const getNextId = markdownAdapter.getNextId.bind(markdownAdapter);

// Folder operations
export { listFolders, createFolder, deleteFolder, renameFolder } from "./folders";

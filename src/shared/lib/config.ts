/**
 * Re-export from new config/ module for backward compatibility.
 * Consumers should gradually migrate to importing from @/config/ directly.
 */
export type { FieldDef, FolderDef, TreeNode, Config, FieldOption } from "@/config/schema";
export { getConfig, getFolderDef, getAbsolutePath, getTree, clearConfigCache } from "@/config/loader";
export { normalizeOptions, getOptionColor } from "@/logic/entities/field-options";

import type { FieldOption } from "@/logic/entities/field-options";

export type { FieldOption };

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  options?: (string | FieldOption)[];
  aliases?: string[];
}

export interface FolderDef {
  id: string;
  label: string;
  path: string;
  icon: string;
  type?: "csv";
  idPattern?: string;
  fields: FieldDef[];
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  hasMarkdown: boolean;
}

export interface Config {
  dataDir: string;
  folders: FolderDef[];
  tree: TreeNode[];
}

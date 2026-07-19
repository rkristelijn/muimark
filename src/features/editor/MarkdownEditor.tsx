"use client";

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  thematicBreakPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  UndoRedo,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./editor-dark.css";
import { useRef, useEffect } from "react";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setMarkdown(content);
    }
  }, [content]);

  return (
    <MDXEditor
      ref={editorRef}
      markdown={content}
      onChange={onChange}
      contentEditableClassName="mdx-editor-content"
      className="mdx-editor-dark"
      suppressHtmlProcessing={true}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        markdownShortcutPlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin(),
        codeMirrorPlugin({ codeBlockLanguages: { bash: "Bash", ts: "TypeScript", json: "JSON", yaml: "YAML" } }),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <CreateLink />
              <InsertTable />
              <InsertThematicBreak />
            </>
          ),
        }),
      ]}
    />
  );
}

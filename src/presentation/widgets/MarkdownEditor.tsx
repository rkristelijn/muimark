'use client';

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
  imagePlugin,
  diffSourcePlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertAdmonition,
  InsertCodeBlock,
  UndoRedo,
  DiffSourceToggleWrapper,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import './editor-dark.css';
import { useRef, useEffect, useState, useCallback } from 'react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { useSlashCommands } from '@/logic/hooks/useSlashCommands';

// @feature F-020 WYSIWYG editing — MDXEditor rich-text
// @feature F-021 Source mode toggle — diffSourcePlugin
// @feature F-024 Code blocks — codeMirrorPlugin with 20+ languages
// @feature F-025 Tables — tablePlugin
// @feature F-026 Admonitions — directivesPlugin
// @feature F-030 Image paste — imagePlugin with upload handler
// @feature F-031 Image insert dialog — InsertImage toolbar button

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onNavigate?: (displayId: string) => void;
  folderId?: string;
  fileId?: string;
}

/** Create an image upload handler bound to a specific folder/file context */
function createImageUploadHandler(folderId?: string, fileId?: string) {
  return async (file: File): Promise<string> => {
    if (!folderId || !fileId) {
      throw new Error('Cannot upload images without file context');
    }
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folderId', folderId);
    formData.append('fileId', fileId);

    const response = await fetch('/api/images/upload', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    const { url } = await response.json();
    return url;
  };
}

/**
 * Markdown WYSIWYG editor with slash commands.
 * Type / at the start of a line or after whitespace to open the command menu.
 */
export default function MarkdownEditor({ content, onChange, onNavigate, folderId, fileId }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.documentElement.getAttribute('data-mui-color-scheme') !== 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-mui-color-scheme') !== 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mui-color-scheme'] });
    return () => observer.disconnect();
  }, []);

  const handleChange = useCallback((value: string) => { onChangeRef.current(value); }, []);

  // Slash commands
  const { slashMenu, handleSelect, handleClose } = useSlashCommands(containerRef, editorRef);

  // Click handler for #ID navigation
  useEffect(() => {
    if (!onNavigate || !containerRef.current) return;
    const handler = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;

      const text = node.textContent;
      const offset = range.startOffset;
      const regex = /(?<!\w)#([A-Za-z]+-\d+)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (offset >= start && offset <= end && match[1]) {
          e.preventDefault();
          onNavigate(match[1].toUpperCase());
          return;
        }
      }
    };
    const el = containerRef.current;
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onNavigate]);

  return (
    <div ref={containerRef}>
      <MDXEditor
        ref={editorRef}
        markdown={content}
        onChange={handleChange}
        contentEditableClassName="mdx-editor-content"
        className={isDark ? 'dark-theme dark-editor' : ''}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          markdownShortcutPlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          tablePlugin(),
          imagePlugin({ imageUploadHandler: createImageUploadHandler(folderId, fileId) }),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              text: 'Plain Text', bash: 'Bash', sh: 'Shell',
              ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
              json: 'JSON', yaml: 'YAML', python: 'Python', go: 'Go',
              rust: 'Rust', sql: 'SQL', css: 'CSS', html: 'HTML', xml: 'XML',
              markdown: 'Markdown', diff: 'Diff', dockerfile: 'Dockerfile',
              ini: 'INI', mermaid: 'Mermaid',
            },
          }),
          directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <ListsToggle />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertCodeBlock />
                <InsertAdmonition />
                <InsertThematicBreak />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
      {slashMenu.open && (
        <SlashCommandMenu
          query={slashMenu.query}
          position={slashMenu.position}
          onSelect={handleSelect}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

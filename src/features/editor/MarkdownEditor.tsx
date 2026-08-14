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
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import './editor-dark.css';
import { useRef, useEffect, useState, useCallback } from 'react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onNavigate?: (displayId: string) => void;
}

/**
 * Markdown WYSIWYG editor.
 *
 * Uses MDXEditor in "uncontrolled" mode: the `content` prop is only used
 * for initial render. Subsequent changes are communicated via onChange.
 * This prevents the setMarkdown→onChange→setState→re-render loop.
 */
export default function MarkdownEditor({ content, onChange, onNavigate }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.documentElement.getAttribute('data-mui-color-scheme') !== 'light';
  });

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const mode = document.documentElement.getAttribute('data-mui-color-scheme');
      setIsDark(mode !== 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mui-color-scheme'],
    });
    return () => observer.disconnect();
  }, []);

  // Stable onChange that always calls latest ref
  const handleChange = useCallback((value: string) => {
    onChangeRef.current(value);
  }, []);

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
        markdown={content}
        onChange={handleChange}
        contentEditableClassName="mdx-editor-content"
        className={isDark ? 'dark-theme dark-editor' : ''}
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
          codeMirrorPlugin({
            codeBlockLanguages: {
              bash: 'Bash',
              ts: 'TypeScript',
              json: 'JSON',
              yaml: 'YAML',
            },
          }),
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
    </div>
  );
}

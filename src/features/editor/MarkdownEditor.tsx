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
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommand } from './slash-commands';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onNavigate?: (displayId: string) => void;
}

interface SlashMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

/**
 * Markdown WYSIWYG editor with slash commands.
 * Type / at the start of a line or after whitespace to open command menu.
 */
export default function MarkdownEditor({ content, onChange, onNavigate }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    open: false,
    query: '',
    position: { top: 0, left: 0 },
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.documentElement.getAttribute('data-mui-color-scheme') !== 'light';
  });

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

  const handleChange = useCallback((value: string) => {
    onChangeRef.current(value);
  }, []);

  // --- Slash command detection ---
  const getCaretPosition = useCallback((): { top: number; left: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }, []);

  const handleInput = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent) {
      if (slashMenu.open) setSlashMenu((s) => ({ ...s, open: false }));
      return;
    }

    const text = node.textContent;
    const offset = range.startOffset;
    const textBefore = text.slice(0, offset);

    const slashMatch = textBefore.match(/(?:^|\s)\/(\w*)$/);

    if (slashMatch) {
      const query = slashMatch[1] || '';
      const pos = getCaretPosition();
      if (pos) {
        setSlashMenu({ open: true, query, position: pos });
      }
    } else if (slashMenu.open) {
      setSlashMenu((s) => ({ ...s, open: false }));
    }
  }, [slashMenu.open, getCaretPosition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const editable = el.querySelector('[contenteditable="true"]');
    if (!editable) return;

    editable.addEventListener('input', handleInput);
    editable.addEventListener('keyup', handleInput);
    return () => {
      editable.removeEventListener('input', handleInput);
      editable.removeEventListener('keyup', handleInput);
    };
  }, [handleInput]);

  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = () => setSlashMenu((s) => ({ ...s, open: false }));
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [slashMenu.open]);

  const handleSlashSelect = useCallback((cmd: SlashCommand) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const offset = range.startOffset;
        const textBefore = text.slice(0, offset);

        const slashMatch = textBefore.match(/(?:^|\s)(\/\w*)$/);
        if (slashMatch && slashMatch.index !== undefined) {
          const deleteStart = slashMatch.index + (slashMatch[0].startsWith(' ') ? 1 : 0);
          const deleteEnd = offset;

          const deleteRange = document.createRange();
          deleteRange.setStart(node, deleteStart);
          deleteRange.setEnd(node, deleteEnd);
          deleteRange.deleteContents();

          const textNode = document.createTextNode(cmd.insert);
          deleteRange.insertNode(textNode);

          const newRange = document.createRange();
          newRange.setStartAfter(textNode);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          const editable = containerRef.current?.querySelector('[contenteditable="true"]');
          if (editable) {
            editable.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }
    setSlashMenu({ open: false, query: '', position: { top: 0, left: 0 } });
  }, []);

  const handleSlashClose = useCallback(() => {
    setSlashMenu({ open: false, query: '', position: { top: 0, left: 0 } });
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
              mermaid: 'Mermaid',
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
      {slashMenu.open && (
        <SlashCommandMenu
          query={slashMenu.query}
          position={slashMenu.position}
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
        />
      )}
    </div>
  );
}

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
import type { SlashCommand } from '@/features/editor/slash-commands';

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
  /** Folder context for image uploads */
  folderId?: string;
  /** File context for image uploads (used as prefix for image filenames) */
  fileId?: string;
}

interface SlashMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
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

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

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
 *
 * Uses MDXEditor in "uncontrolled" mode: the `content` prop is only used
 * for initial render. Subsequent changes are communicated via onChange.
 *
 * Type / at the start of a line or after whitespace to open the command menu.
 */
export default function MarkdownEditor({ content, onChange, onNavigate, folderId, fileId }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
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

  // --- Slash command detection ---
  const getCaretPosition = useCallback((): { top: number; left: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.top === 0 && rect.left === 0) {
      // Fallback: use parent element position
      const el = range.startContainer.parentElement;
      if (el) {
        const elRect = el.getBoundingClientRect();
        return { top: elRect.bottom + 4, left: elRect.left };
      }
      return null;
    }
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

    // Match / at start of text or after whitespace
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

  // Attach input/keyup listeners to the contenteditable element
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let editable: Element | null = null;
    const attachListeners = (target: Element) => {
      target.addEventListener('input', handleInput);
      target.addEventListener('keyup', handleInput);
    };
    const detachListeners = (target: Element) => {
      target.removeEventListener('input', handleInput);
      target.removeEventListener('keyup', handleInput);
    };

    // Try immediately
    editable = el.querySelector('[contenteditable="true"]');
    if (editable) {
      attachListeners(editable);
    }

    // Also observe for late mount (MDXEditor renders async)
    const observer = new MutationObserver(() => {
      const found = el.querySelector('[contenteditable="true"]');
      if (found && found !== editable) {
        if (editable) detachListeners(editable);
        editable = found;
        attachListeners(editable);
      }
    });
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (editable) detachListeners(editable);
    };
  }, [handleInput]);

  // Close menu on outside click
  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = () => setSlashMenu((s) => ({ ...s, open: false }));
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [slashMenu.open]);

  const handleSlashSelect = useCallback((cmd: SlashCommand) => {
    // Remove the /query text using execCommand so Lexical sees the change
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

          // Select the /query text and delete via execCommand (Lexical-aware)
          const deleteRange = document.createRange();
          deleteRange.setStart(node, deleteStart);
          deleteRange.setEnd(node, deleteEnd);
          selection.removeAllRanges();
          selection.addRange(deleteRange);
          document.execCommand('delete');
        }
      }
    }

    // Insert the command's markdown content via MDXEditor API
    if (editorRef.current) {
      editorRef.current.insertMarkdown(cmd.insert);
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
        ref={editorRef}
        markdown={content}
        onChange={handleChange}
        contentEditableClassName="mdx-editor-content"
        className={isDark ? 'dark-theme dark-editor' : ''}
        plugins={[
          // Structure
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          markdownShortcutPlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          tablePlugin(),

          // Images — paste, drop, insert via dialog
          imagePlugin({ imageUploadHandler: createImageUploadHandler(folderId, fileId) }),

          // Code blocks with extended language support
          codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              text: 'Plain Text',
              bash: 'Bash',
              sh: 'Shell',
              ts: 'TypeScript',
              tsx: 'TSX',
              js: 'JavaScript',
              jsx: 'JSX',
              json: 'JSON',
              yaml: 'YAML',
              python: 'Python',
              go: 'Go',
              rust: 'Rust',
              sql: 'SQL',
              css: 'CSS',
              html: 'HTML',
              xml: 'XML',
              markdown: 'Markdown',
              diff: 'Diff',
              dockerfile: 'Dockerfile',
              ini: 'INI',
              mermaid: 'Mermaid',
            },
          }),

          // Admonitions — :::note, :::tip, :::info, :::caution, :::danger
          directivesPlugin({
            directiveDescriptors: [AdmonitionDirectiveDescriptor],
          }),

          // Source/WYSIWYG/diff toggle
          diffSourcePlugin({ viewMode: 'rich-text' }),

          // Toolbar
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
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
        />
      )}
    </div>
  );
}

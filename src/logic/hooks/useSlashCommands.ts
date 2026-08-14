'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { SlashCommand } from '@/features/editor/slash-commands';
import type { MDXEditorMethods } from '@mdxeditor/editor';

export interface SlashMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

const CLOSED: SlashMenuState = { open: false, query: '', position: { top: 0, left: 0 } };

/**
 * Hook that manages slash command detection and insertion.
 * Attaches to a container element and watches for `/` typing in contenteditable.
 */
export function useSlashCommands(
  containerRef: React.RefObject<HTMLDivElement | null>,
  editorRef: React.RefObject<MDXEditorMethods | null>
) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(CLOSED);

  const getCaretPosition = useCallback((): { top: number; left: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.top === 0 && rect.left === 0) {
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
    const slashMatch = textBefore.match(/(?:^|\s)\/(\w*)$/);

    if (slashMatch) {
      const query = slashMatch[1] || '';
      const pos = getCaretPosition();
      if (pos) setSlashMenu({ open: true, query, position: pos });
    } else if (slashMenu.open) {
      setSlashMenu((s) => ({ ...s, open: false }));
    }
  }, [slashMenu.open, getCaretPosition]);

  // Attach input/keyup listeners to the contenteditable element
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let editable: Element | null = null;
    const attach = (target: Element) => {
      target.addEventListener('input', handleInput);
      target.addEventListener('keyup', handleInput);
    };
    const detach = (target: Element) => {
      target.removeEventListener('input', handleInput);
      target.removeEventListener('keyup', handleInput);
    };

    editable = el.querySelector('[contenteditable="true"]');
    if (editable) attach(editable);

    const observer = new MutationObserver(() => {
      const found = el.querySelector('[contenteditable="true"]');
      if (found && found !== editable) {
        if (editable) detach(editable);
        editable = found;
        attach(editable);
      }
    });
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (editable) detach(editable);
    };
  }, [handleInput, containerRef]);

  // Close on outside click
  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = () => setSlashMenu((s) => ({ ...s, open: false }));
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [slashMenu.open]);

  const handleSelect = useCallback((cmd: SlashCommand) => {
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
          const deleteRange = document.createRange();
          deleteRange.setStart(node, deleteStart);
          deleteRange.setEnd(node, offset);
          selection.removeAllRanges();
          selection.addRange(deleteRange);
          document.execCommand('delete');
        }
      }
    }

    if (editorRef.current) {
      editorRef.current.insertMarkdown(cmd.insert);
    }

    setSlashMenu(CLOSED);
  }, [editorRef]);

  const handleClose = useCallback(() => setSlashMenu(CLOSED), []);

  return { slashMenu, handleSelect, handleClose };
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FileDetail } from '@/shared/lib/files';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export interface AutoSaveState {
  content: string;
  setContent: (content: string) => void;
  saveStatus: SaveStatus;
  saveNow: () => void;
  file: FileDetail | undefined;
  isLoading: boolean;
  isReady: boolean;
}

/**
 * Manages file content with debounced auto-save.
 * Fetches file data, tracks edits, and saves after 1s of inactivity.
 */
export function useAutoSave(folderId: string, fileId: string): AutoSaveState {
  const queryClient = useQueryClient();
  const [content, setContentState] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [initialized, setInitialized] = useState(false);
  const contentRef = useRef('');
  const fileRef = useRef<FileDetail | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: file, isLoading } = useQuery<FileDetail>({
    queryKey: ['file', folderId, fileId],
    queryFn: () => fetch(`/api/folders/${folderId}/${fileId}`).then((r) => r.json()),
  });

  // Initialize content from server (once per file)
  useEffect(() => {
    if (file?.content && !initialized) {
      setContentState(file.content);
      contentRef.current = file.content;
      setInitialized(true);
    }
  }, [file, initialized]);

  // Reset when file changes
  useEffect(() => {
    setInitialized(false);
    setSaveStatus('saved');
  }, [folderId, fileId]);

  useEffect(() => {
    if (file) fileRef.current = file;
  }, [file]);

  const doSave = useCallback(async () => {
    const currentContent = contentRef.current;
    const frontmatter = fileRef.current?.frontmatter || {};
    if (!currentContent) return;

    setSaveStatus('saving');

    queryClient.setQueryData(
      ['file', folderId, fileId],
      (old: FileDetail | undefined) => (old ? { ...old, content: currentContent } : old)
    );

    try {
      const res = await fetch(`/api/folders/${folderId}/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, content: currentContent }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['folder', folderId] });
    } catch {
      setSaveStatus('error');
      queryClient.invalidateQueries({ queryKey: ['file', folderId, fileId] });
    }
  }, [folderId, fileId, queryClient]);

  const scheduleAutoSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(doSave, 1000);
  }, [doSave]);

  const setContent = useCallback(
    (newContent: string) => {
      setContentState(newContent);
      contentRef.current = newContent;
      setSaveStatus('dirty');
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const saveNow = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (saveStatus === 'dirty') doSave();
  }, [doSave, saveStatus]);

  return { content, setContent, saveStatus, saveNow, file, isLoading, isReady: initialized };
}

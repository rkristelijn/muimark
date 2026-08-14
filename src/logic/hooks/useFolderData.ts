'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FolderDef } from '@/shared/lib/config';
import type { FileEntry } from '@/shared/lib/files';

interface FolderResponse {
  folder: FolderDef;
  files: (FileEntry & { git?: unknown })[];
}

export interface FolderDataState {
  folderDef: FolderDef | undefined;
  files: FileEntry[];
  folderPath: string | null;
  isCsv: boolean;
  isLoading: boolean;
  selectFolder: (
    folderId: string,
    callbacks: {
      onFile?: (fileId: string, displayId?: string) => void;
      onNavigate?: (folderId: string, displayId: string | null) => void;
    }
  ) => void;
}

/**
 * Manages folder data fetching and file listing.
 * Fetches folder info on selection, determines type (csv/markdown),
 * and provides the file list.
 */
export function useFolderData(selectedFolder: string | null): FolderDataState {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [isCsv, setIsCsv] = useState(false);

  const { data, isLoading } = useQuery<FolderResponse>({
    queryKey: ['folder', selectedFolder],
    queryFn: () =>
      fetch(`/api/folders/${selectedFolder}`).then((r) => r.json()),
    enabled: !!selectedFolder,
  });

  const selectFolder = useCallback(
    (
      folderId: string,
      callbacks: {
        onFile?: (fileId: string, displayId?: string) => void;
        onNavigate?: (folderId: string, displayId: string | null) => void;
      }
    ) => {
      setIsCsv(false);

      fetch(`/api/folders/${folderId}`)
        .then((r) => r.json())
        .then((res: FolderResponse) => {
          if (res.folder?.path) setFolderPath(res.folder.path);

          if (res.folder?.type === 'csv') {
            setIsCsv(true);
            callbacks.onNavigate?.(folderId, null);
            return;
          }

          if (res.files?.length) {
            const first = res.files[0];
            if (first) {
              const displayId = (first as unknown as { displayId?: string }).displayId || first.id;
              callbacks.onFile?.(first.id, displayId);
              callbacks.onNavigate?.(folderId, displayId);
            }
          } else {
            callbacks.onNavigate?.(folderId, null);
          }
        })
        .catch(() => {
          callbacks.onNavigate?.(folderId, null);
        });
    },
    []
  );

  return {
    folderDef: data?.folder,
    files: data?.files ?? [],
    folderPath: folderPath || data?.folder?.path || null,
    isCsv: isCsv || data?.folder?.type === 'csv',
    isLoading,
    selectFolder,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';

function parseUrl(): { folder: string | null; file: string | null } {
  if (typeof window === 'undefined') return { folder: null, file: null };
  const parts = window.location.pathname.split('/').filter(Boolean);
  return {
    folder: parts[0] || null,
    file: parts[1] || null,
  };
}

export interface RouterState {
  selectedFolder: string | null;
  selectedFile: string | null;
  setSelectedFolder: (folder: string | null) => void;
  setSelectedFile: (file: string | null) => void;
  navigate: (folder: string | null, displayId: string | null) => void;
  goHome: () => void;
}

/**
 * Manages URL ↔ state synchronization.
 * Parses the URL on mount, syncs on popstate, and pushes on navigation.
 */
export function useRouterState(): RouterState {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Parse URL on mount
  useEffect(() => {
    const { folder, file } = parseUrl();
    setSelectedFolder(folder);

    if (folder && file) {
      fetch(`/api/resolve?id=${encodeURIComponent(file)}`)
        .then((r) => r.json())
        .then((data) => {
          setSelectedFile(data.fileId ?? file);
        })
        .catch(() => setSelectedFile(file));
    }
  }, []);

  // Sync on browser back/forward
  useEffect(() => {
    const handler = () => {
      const { folder, file } = parseUrl();
      setSelectedFolder(folder);
      setSelectedFile(file);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Push URL without reload
  const navigate = useCallback(
    (folder: string | null, displayId: string | null) => {
      const path = folder
        ? displayId
          ? `/${folder}/${displayId}`
          : `/${folder}`
        : '/';
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    },
    []
  );

  const goHome = useCallback(() => {
    setSelectedFolder(null);
    setSelectedFile(null);
    navigate(null, null);
  }, [navigate]);

  return {
    selectedFolder,
    selectedFile,
    setSelectedFolder,
    setSelectedFile,
    navigate,
    goHome,
  };
}

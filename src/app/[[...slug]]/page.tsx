'use client';

import { Box, Typography } from '@mui/material';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/presentation/panels/AppShell';
import { FileGrid } from '@/features/folders/FileGrid';
import { DetailPanel } from '@/presentation/panels/DetailPanel';
import { SearchResults } from '@/presentation/widgets/SearchResults';
import { CsvGrid } from '@/features/csv/CsvGrid';
import { useRouterState } from '@/state/useRouterState';
import { useFolderData } from '@/state/useFolderData';
import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(
  () => import('@/presentation/widgets/MarkdownEditor'),
  { ssr: false }
);

export default function Home() {
  const router = useRouterState();
  const folder = useFolderData(router.selectedFolder);

  const [searchValue, setSearchValue] = useState('');
  const [searchSelectedFolder, setSearchSelectedFolder] = useState<string | null>(null);
  const [searchSelectedFile, setSearchSelectedFile] = useState<string | null>(null);

  const handleSelectFolder = useCallback(
    (id: string) => {
      router.setSelectedFolder(id);
      router.setSelectedFile(null);
      setSearchValue('');
      setSearchSelectedFolder(null);
      setSearchSelectedFile(null);

      folder.selectFolder(id, {
        onFile: (fileId, displayId) => {
          router.setSelectedFile(fileId);
        },
        onNavigate: (folderId, displayId) => {
          router.navigate(folderId, displayId);
        },
      });
    },
    [router, folder]
  );

  const handleSelectFile = useCallback(
    (fileId: string, displayId?: string) => {
      router.setSelectedFile(fileId);
      router.navigate(router.selectedFolder, displayId || fileId);
    },
    [router]
  );

  const handleNavigate = useCallback(
    (folderId: string, fileId: string) => {
      router.setSelectedFolder(folderId);
      router.setSelectedFile(fileId);
      setSearchValue('');
      setSearchSelectedFolder(null);
      setSearchSelectedFile(null);

      fetch(`/api/folders/${folderId}`)
        .then((r) => r.json())
        .then((data) => {
          const file = data.files?.find((f: { id: string }) => f.id === fileId);
          router.navigate(folderId, file?.displayId || fileId);
        })
        .catch(() => router.navigate(folderId, fileId));
    },
    [router]
  );

  const handleEditorNavigate = useCallback(
    (displayId: string) => {
      fetch(`/api/resolve?id=${encodeURIComponent(displayId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.folderId && data.fileId) {
            router.setSelectedFolder(data.folderId);
            router.setSelectedFile(data.fileId);
            setSearchValue('');
            router.navigate(data.folderId, displayId);
          }
        })
        .catch(() => {});
    },
    [router]
  );

  const handleHome = useCallback(() => {
    router.goHome();
    setSearchValue('');
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);
  }, [router]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchValue(val);
    if (val.length < 2) {
      setSearchSelectedFolder(null);
      setSearchSelectedFile(null);
    }
  }, []);

  const isSearching = searchValue.length >= 2;

  return (
    <DashboardLayout
      selectedFolder={router.selectedFolder}
      onSelectFolder={handleSelectFolder}
      onHome={handleHome}
      searchValue={searchValue}
      onSearchChange={handleSearchChange}
    >
      {isSearching && (
        <SearchView
          query={searchValue}
          selectedFolder={searchSelectedFolder}
          selectedFile={searchSelectedFile}
          onSelect={(f, file) => {
            setSearchSelectedFolder(f);
            setSearchSelectedFile(file);
          }}
          onNavigate={handleEditorNavigate}
        />
      )}

      {!isSearching && router.selectedFolder && (
        <FolderView
          folderId={router.selectedFolder}
          selectedFile={router.selectedFile}
          isCsv={folder.isCsv}
          folderPath={folder.folderPath}
          onSelectFile={handleSelectFile}
          onNavigate={handleNavigate}
          onEditorNavigate={handleEditorNavigate}
        />
      )}

      {!isSearching && !router.selectedFolder && <WelcomeView />}
    </DashboardLayout>
  );
}

// --- Sub-views (keep page.tsx as orchestrator) ---

function SearchView({
  query,
  selectedFolder,
  selectedFile,
  onSelect,
  onNavigate,
}: {
  query: string;
  selectedFolder: string | null;
  selectedFile: string | null;
  onSelect: (folderId: string, fileId: string) => void;
  onNavigate: (displayId: string) => void;
}) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <SearchResults query={query} onSelect={onSelect} selectedFile={selectedFile} />
      </Box>
      {selectedFolder && selectedFile && (
        <Box
          sx={{ flex: 1, overflow: 'auto', minHeight: 0, borderTop: 1, borderColor: 'divider' }}
        >
          <DetailPanel
            key={`${selectedFolder}/${selectedFile}`}
            folderId={selectedFolder}
            fileId={selectedFile}
            onNavigate={onNavigate}
          />
        </Box>
      )}
    </Box>
  );
}

function FolderView({
  folderId,
  selectedFile,
  isCsv,
  folderPath,
  onSelectFile,
  onNavigate,
  onEditorNavigate,
}: {
  folderId: string;
  selectedFile: string | null;
  isCsv: boolean;
  folderPath: string | null;
  onSelectFile: (id: string, displayId?: string) => void;
  onNavigate: (folderId: string, fileId: string) => void;
  onEditorNavigate: (displayId: string) => void;
}) {
  if (isCsv && folderPath) {
    return <CsvGrid csvPath={folderPath} />;
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <FileGrid
          folderId={folderId}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onNavigate={onNavigate}
          onCreated={onSelectFile}
          searchFilter=""
        />
      </Box>
      {selectedFile && (
        <Box
          sx={{ flex: 1, overflow: 'auto', minHeight: 0, borderTop: 1, borderColor: 'divider' }}
        >
          <DetailPanel
            key={selectedFile}
            folderId={folderId}
            fileId={selectedFile}
            onNavigate={onEditorNavigate}
          />
        </Box>
      )}
    </Box>
  );
}

function WelcomeView() {
  const { data } = useQuery<{ content: string | null }>({
    queryKey: ['readme'],
    queryFn: () => fetch('/api/readme').then((r) => r.json()),
  });

  if (!data?.content) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">Select a folder from the sidebar</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
      <MarkdownEditor content={data.content} onChange={() => {}} />
    </Box>
  );
}

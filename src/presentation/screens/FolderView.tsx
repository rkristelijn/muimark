'use client';

import { Box } from '@mui/material';
import { FileGrid } from '@/features/folders/FileGrid';
import { CsvGrid } from '@/features/csv/CsvGrid';
import { DetailPanel } from '@/presentation/panels/DetailPanel';

interface FolderViewProps {
  folderId: string;
  selectedFile: string | null;
  isCsv: boolean;
  folderPath: string | null;
  onSelectFile: (id: string, displayId?: string) => void;
  onNavigate: (folderId: string, fileId: string) => void;
  onEditorNavigate: (displayId: string) => void;
}

export function FolderView({
  folderId,
  selectedFile,
  isCsv,
  folderPath,
  onSelectFile,
  onNavigate,
  onEditorNavigate,
}: FolderViewProps) {
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

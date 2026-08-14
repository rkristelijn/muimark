'use client';

import { Box } from '@mui/material';
import { SearchResults } from '@/presentation/widgets/SearchResults';
import { DetailPanel } from '@/presentation/panels/DetailPanel';

interface SearchViewProps {
  query: string;
  selectedFolder: string | null;
  selectedFile: string | null;
  onSelect: (folderId: string, fileId: string) => void;
  onNavigate: (displayId: string) => void;
}

export function SearchView({
  query,
  selectedFolder,
  selectedFile,
  onSelect,
  onNavigate,
}: SearchViewProps) {
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

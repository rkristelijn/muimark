'use client';

import { Box, CircularProgress, Typography, Chip } from '@mui/material';
import dynamic from 'next/dynamic';
import { useAutoSave } from '@/logic/hooks/useAutoSave';

const MarkdownEditor = dynamic(() => import('../widgets/MarkdownEditor'), { ssr: false });

interface DetailPanelProps {
  folderId: string;
  fileId: string;
  onNavigate?: (displayId: string) => void;
}

export function DetailPanel({ folderId, fileId, onNavigate }: DetailPanelProps) {
  const { content, setContent, saveStatus, saveNow, file, isLoading, isReady } =
    useAutoSave(folderId, fileId);

  if (isLoading || !isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!file) {
    return <Box sx={{ p: 2 }}>File not found</Box>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {file.filename}
        </Typography>
        <Chip
          label={
            saveStatus === 'saved' ? 'Saved' :
            saveStatus === 'saving' ? 'Saving...' :
            saveStatus === 'error' ? 'Error saving' :
            'Unsaved'
          }
          size="small"
          color={
            saveStatus === 'saved' ? 'success' :
            saveStatus === 'error' ? 'error' :
            'default'
          }
          variant="outlined"
        />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }} onBlur={saveNow}>
        <MarkdownEditor content={content} onChange={setContent} onNavigate={onNavigate} folderId={folderId} fileId={fileId} />
      </Box>
    </Box>
  );
}

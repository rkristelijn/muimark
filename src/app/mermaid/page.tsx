'use client';

import { Box, Toolbar, Typography, AppBar } from '@mui/material';
import { AccountTree } from '@mui/icons-material';
import dynamic from 'next/dynamic';

const MermaidEditor = dynamic(
  () => import('@/plugins/mermaid/MermaidEditor').then((m) => ({ default: m.MermaidEditor })),
  { ssr: false }
);

export default function MermaidPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={0} color="default">
        <Toolbar variant="dense">
          <AccountTree sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap>
            Mermaid Editor
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MermaidEditor height="100%" />
      </Box>
    </Box>
  );
}

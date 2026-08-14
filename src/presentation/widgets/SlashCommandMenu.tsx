'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Paper, List, ListItemButton, ListItemText, Typography, Box } from '@mui/material';
import { slashCommands, type SlashCommand } from '@/features/editor/slash-commands';

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ query, position, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = slashCommands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return cmd.label.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q) || cmd.id.includes(q);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  if (filtered.length === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1300,
        maxHeight: 300,
        width: 280,
        overflow: 'auto',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <List dense ref={listRef} sx={{ py: 0.5 }}>
        {filtered.map((cmd, idx) => (
          <ListItemButton
            key={cmd.id}
            selected={idx === selectedIndex}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(idx)}
            sx={{ py: 0.5, px: 1.5 }}
          >
            <Box sx={{ width: 28, textAlign: 'center', mr: 1, fontSize: '1rem' }}>
              {cmd.icon}
            </Box>
            <ListItemText
              primary={cmd.label}
              secondary={cmd.description}
              slotProps={{
                primary: { variant: 'body2', sx: { fontWeight: 500 } },
                secondary: { variant: 'caption', noWrap: true },
              }}
            />
            <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
              {cmd.category}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}

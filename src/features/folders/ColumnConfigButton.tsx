"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { ViewColumn, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import type { ColumnConfigEntry } from "./useColumnConfig";

interface ColumnDef {
  field: string;
  headerName: string;
}

interface ColumnConfigButtonProps {
  folderId: string;
  allColumns: ColumnDef[];
  columnConfig: ColumnConfigEntry[];
  onConfigChange: (config: ColumnConfigEntry[]) => void;
}

export function ColumnConfigButton({
  allColumns,
  columnConfig,
  onConfigChange,
}: ColumnConfigButtonProps) {
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<ColumnConfigEntry[]>([]);

  const handleOpen = () => {
    // Initialize local state from current config or all columns
    if (columnConfig.length > 0) {
      // Merge: add any new columns not in config yet
      const existingFields = new Set(columnConfig.map((c) => c.field));
      const merged = [
        ...columnConfig,
        ...allColumns
          .filter((col) => !existingFields.has(col.field))
          .map((col) => ({ field: col.field, visible: true })),
      ];
      setLocalConfig(merged);
    } else {
      setLocalConfig(
        allColumns.map((col) => ({ field: col.field, visible: true }))
      );
    }
    setOpen(true);
  };

  const handleToggle = (field: string) => {
    setLocalConfig((prev) =>
      prev.map((c) => (c.field === field ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    setLocalConfig((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const a = next[index]!;
      const b = next[targetIndex]!;
      next[index] = b;
      next[targetIndex] = a;
      return next;
    });
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    setOpen(false);
  };

  const getLabel = (field: string): string => {
    const col = allColumns.find((c) => c.field === field);
    return col?.headerName || field;
  };

  return (
    <>
      <Tooltip title="Configure columns">
        <IconButton size="small" onClick={handleOpen}>
          <ViewColumn />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Configure Columns</DialogTitle>
        <DialogContent dividers>
          <List dense disablePadding>
            {localConfig.map((entry, index) => (
              <ListItem
                key={entry.field}
                disablePadding
                secondaryAction={
                  <>
                    <IconButton
                      size="small"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={index === localConfig.length - 1}
                      onClick={() => handleMove(index, "down")}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </>
                }
              >
                <ListItemButton onClick={() => handleToggle(entry.field)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={entry.visible}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary={getLabel(entry.field)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

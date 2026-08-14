"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { DriveFileRenameOutline } from "@mui/icons-material";
import { useFileActions } from "@/logic/hooks/useFileActions";

interface RenameDialogProps {
  folderId: string;
  fileId: string;
  onRenamed?: (newId: string) => void;
}

export function RenameDialog({ folderId, fileId, onRenamed }: RenameDialogProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(fileId);
  const { renameFile, isRenaming, renameError, resetRenameError } = useFileActions(folderId);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetRenameError();
    setNewName(fileId);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === fileId) return;

    renameFile(
      { fileId, newName: trimmed },
      {
        onSuccess: (data) => {
          setOpen(false);
          onRenamed?.(data.newId);
        },
      }
    );
  };

  const isValid = newName.trim().length > 0 && newName.trim() !== fileId;

  return (
    <>
      <Tooltip title="Rename">
        <IconButton
          size="small"
          onClick={handleOpen}
          color="default"
          aria-label={`Rename ${fileId}`}
        >
          <DriveFileRenameOutline fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="rename-dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="rename-dialog-title">Rename file</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="New filename"
              fullWidth
              variant="outlined"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              helperText={renameError?.message || "Without .md extension"}
              error={!!renameError}
              sx={{ mt: 1 }}
              disabled={isRenaming}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValid || isRenaming}
            >
              {isRenaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  CreateNewFolder,
  Delete,
  DriveFileRenameOutline,
  MoreVert,
} from "@mui/icons-material";
import { useFolderActions } from "./useFolderActions";

interface FolderActionsProps {
  folderId?: string;
  folderLabel?: string;
  onFolderCreated?: (id: string) => void;
  onFolderDeleted?: () => void;
  onFolderRenamed?: (newId: string) => void;
}

type ActiveDialog = "create" | "delete" | "rename" | null;

export function FolderActions({
  folderId,
  folderLabel,
  onFolderCreated,
  onFolderDeleted,
  onFolderRenamed,
}: FolderActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [inputValue, setInputValue] = useState("");

  const {
    createFolder, isCreating, createError, resetCreateError,
    deleteFolder, isDeleting, deleteError, resetDeleteError,
    renameFolder, isRenaming, renameError, resetRenameError,
  } = useFolderActions();

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const openDialog = (dialog: ActiveDialog, defaultValue = "") => {
    handleMenuClose();
    setInputValue(defaultValue);
    resetCreateError();
    resetDeleteError();
    resetRenameError();
    setActiveDialog(dialog);
  };

  const closeDialog = () => setActiveDialog(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    createFolder(trimmed, {
      onSuccess: (data) => {
        closeDialog();
        onFolderCreated?.(data.id);
      },
    });
  };

  const handleDelete = () => {
    if (!folderId) return;
    deleteFolder(folderId, {
      onSuccess: () => {
        closeDialog();
        onFolderDeleted?.();
      },
    });
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || !folderId) return;
    renameFolder(
      { folderId, newName: trimmed },
      {
        onSuccess: (data) => {
          closeDialog();
          onFolderRenamed?.(data.newId);
        },
      }
    );
  };

  return (
    <>
      <Tooltip title="Folder actions">
        <IconButton size="small" onClick={handleMenuOpen} aria-label="Folder actions">
          <MoreVert fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => openDialog("create")}>
          <ListItemIcon><CreateNewFolder fontSize="small" /></ListItemIcon>
          <ListItemText>New folder</ListItemText>
        </MenuItem>
        {folderId && (
          <MenuItem onClick={() => openDialog("rename", folderLabel || "")}>
            <ListItemIcon><DriveFileRenameOutline fontSize="small" /></ListItemIcon>
            <ListItemText>Rename folder</ListItemText>
          </MenuItem>
        )}
        {folderId && (
          <MenuItem onClick={() => openDialog("delete")}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Delete folder</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create folder dialog */}
      <Dialog open={activeDialog === "create"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>New folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="Folder path"
              fullWidth
              variant="outlined"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText={createError?.message || "Relative path, e.g. 'docs/guides'"}
              error={!!createError}
              sx={{ mt: 1 }}
              disabled={isCreating}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!inputValue.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete folder dialog */}
      <Dialog open={activeDialog === "delete"} onClose={closeDialog}>
        <DialogTitle>Delete folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{folderLabel || folderId}</strong>?
            The folder must be empty.
          </DialogContentText>
          {deleteError && (
            <DialogContentText color="error" sx={{ mt: 1 }}>
              {deleteError.message}
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={activeDialog === "rename"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleRename}>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="New name"
              fullWidth
              variant="outlined"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText={renameError?.message}
              error={!!renameError}
              sx={{ mt: 1 }}
              disabled={isRenaming}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!inputValue.trim() || isRenaming}>
              {isRenaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

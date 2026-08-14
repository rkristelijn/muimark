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
  Tooltip,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useFileActions } from "@/logic/hooks/useFileActions";

interface DeleteDialogProps {
  folderId: string;
  fileId: string;
  fileTitle: string;
  onDeleted?: () => void;
}

export function DeleteDialog({ folderId, fileId, fileTitle, onDeleted }: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const { deleteFile, isDeleting, deleteError, resetDeleteError } = useFileActions(folderId);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteError();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleConfirm = () => {
    deleteFile(fileId, {
      onSuccess: () => {
        setOpen(false);
        onDeleted?.();
      },
    });
  };

  return (
    <>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          onClick={handleOpen}
          color="default"
          aria-label={`Delete ${fileTitle}`}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} aria-labelledby="delete-dialog-title">
        <DialogTitle id="delete-dialog-title">Delete file</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{fileTitle}</strong> ({fileId})?
            This action cannot be undone.
          </DialogContentText>
          {deleteError && (
            <DialogContentText color="error" sx={{ mt: 1 }}>
              {deleteError.message}
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

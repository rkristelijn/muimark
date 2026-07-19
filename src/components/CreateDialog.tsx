"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { Add } from "@mui/icons-material";

interface CreateDialogProps {
  folderId: string;
}

export function CreateDialog({ folderId }: CreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
      setOpen(false);
      setTitle("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      mutation.mutate(title.trim());
    }
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
      >
        New
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="create-dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="create-dialog-title">New record</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="Title"
              fullWidth
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mt: 1 }}
              disabled={mutation.isPending}
            />
            {mutation.isError && (
              <TextField
                error
                helperText={mutation.error.message}
                sx={{ mt: 1 }}
                fullWidth
                disabled
                value=""
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!title.trim() || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

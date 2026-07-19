"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Save } from "@mui/icons-material";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { FileDetail } from "@/shared/lib/files";

// MDXEditor must be loaded client-side only
const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), { ssr: false });

interface DetailPanelProps {
  folderId: string;
  fileId: string;
}

export function DetailPanel({ folderId, fileId }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [syncedFileId, setSyncedFileId] = useState<string | null>(null);

  const { data: file, isLoading } = useQuery<FileDetail>({
    queryKey: ["file", folderId, fileId],
    queryFn: () => fetch(`/api/folders/${folderId}/${fileId}`).then((r) => r.json()),
  });

  // Sync server content to local state when file changes (not an effect-sets-state anti-pattern:
  // this is synchronizing external data → local edit buffer, only runs when fileId changes)
  if (file?.content && syncedFileId !== fileId) {
    setEditedContent(file.content);
    setIsDirty(false);
    setSyncedFileId(fileId);
  }

  const handleChange = useCallback((newContent: string) => {
    setEditedContent(newContent);
    setIsDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/folders/${folderId}/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontmatter: file?.frontmatter || {},
          content: editedContent,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["file", folderId, fileId] });
      queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!file) {
    return <Box sx={{ p: 2 }}>File not found</Box>;
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {file.filename}
          {isDirty && " (unsaved)"}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<Save />}
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        <MarkdownEditor content={editedContent} onChange={handleChange} />
      </Box>
    </Box>
  );
}

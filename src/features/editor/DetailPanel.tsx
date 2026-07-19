"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Typography, Chip } from "@mui/material";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { FileDetail } from "@/shared/lib/files";

// MDXEditor must be loaded client-side only
const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), { ssr: false });

interface DetailPanelProps {
  folderId: string;
  fileId: string;
  onNavigate?: (displayId: string) => void;
}

export function DetailPanel({ folderId, fileId, onNavigate }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [editedContent, setEditedContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [initialized, setInitialized] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef("");
  const fileRef = useRef<FileDetail | null>(null);

  const { data: file, isLoading } = useQuery<FileDetail>({
    queryKey: ["file", folderId, fileId],
    queryFn: () => fetch(`/api/folders/${folderId}/${fileId}`).then((r) => r.json()),
  });

  // Initialize content from server (only once per mount)
  if (file?.content && !initialized) {
    setEditedContent(file.content);
    setInitialized(true);
  }

  useEffect(() => {
    contentRef.current = editedContent;
  }, [editedContent]);

  useEffect(() => {
    if (file) fileRef.current = file;
  }, [file]);

  const doSave = useCallback(async () => {
    const content = contentRef.current;
    const frontmatter = fileRef.current?.frontmatter || {};
    if (!content) return;

    setSaveStatus("saving");

    // Optimistic update: write to cache immediately
    queryClient.setQueryData(["file", folderId, fileId], (old: FileDetail | undefined) => {
      if (!old) return old;
      return { ...old, content };
    });

    try {
      const res = await fetch(`/api/folders/${folderId}/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontmatter, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setIsDirty(false);
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
    } catch {
      setSaveStatus("error");
      // Rollback: refetch from server
      queryClient.invalidateQueries({ queryKey: ["file", folderId, fileId] });
    }
  }, [folderId, fileId, queryClient]);

  // Debounced auto-save: save 1s after last edit
  const scheduleAutoSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      doSave();
    }, 1000);
  }, [doSave]);

  // Save immediately (for blur)
  const saveNow = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (isDirty) {
      doSave();
    }
  }, [doSave, isDirty]);

  const handleChange = useCallback((newContent: string) => {
    setEditedContent(newContent);
    contentRef.current = newContent;
    setIsDirty(true);
    setSaveStatus("dirty");
    scheduleAutoSave();
  }, [scheduleAutoSave]);

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
        </Typography>
        <Chip
          label={
            saveStatus === "saved" ? "Saved" :
            saveStatus === "saving" ? "Saving..." :
            saveStatus === "error" ? "Error saving" :
            "Unsaved"
          }
          size="small"
          color={
            saveStatus === "saved" ? "success" :
            saveStatus === "error" ? "error" :
            "default"
          }
          variant="outlined"
        />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 1 }} onBlur={saveNow}>
        <MarkdownEditor content={editedContent} onChange={handleChange} onNavigate={onNavigate} />
      </Box>
    </Box>
  );
}

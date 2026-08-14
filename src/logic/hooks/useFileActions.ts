"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeleteResult {
  ok: boolean;
  message: string;
}

interface RenameResult {
  ok: boolean;
  newId: string;
  message: string;
}

export function useFileActions(folderId: string) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation<DeleteResult, Error, string>({
    mutationFn: async (fileId) => {
      const res = await fetch(`/api/folders/${folderId}/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
    },
  });

  const renameMutation = useMutation<RenameResult, Error, { fileId: string; newName: string }>({
    mutationFn: async ({ fileId, newName }) => {
      const res = await fetch(`/api/folders/${folderId}/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to rename");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
    },
  });

  return {
    deleteFile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    resetDeleteError: deleteMutation.reset,

    renameFile: renameMutation.mutate,
    isRenaming: renameMutation.isPending,
    renameError: renameMutation.error,
    resetRenameError: renameMutation.reset,
    renameResult: renameMutation.data,
  };
}

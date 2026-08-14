"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateResult {
  id: string;
  path: string;
  message: string;
}

interface RenameResult {
  ok: boolean;
  newId: string;
  newPath: string;
  message: string;
}

interface DeleteResult {
  ok: boolean;
  message: string;
}

export function useFolderActions() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const createMutation = useMutation<CreateResult, Error, string>({
    mutationFn: async (folderPath) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create folder");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation<DeleteResult, Error, string>({
    mutationFn: async (folderId) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete folder");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  const renameMutation = useMutation<RenameResult, Error, { folderId: string; newName: string }>({
    mutationFn: async ({ folderId, newName }) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to rename folder");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  return {
    createFolder: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    createResult: createMutation.data,
    resetCreateError: createMutation.reset,

    deleteFolder: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    resetDeleteError: deleteMutation.reset,

    renameFolder: renameMutation.mutate,
    isRenaming: renameMutation.isPending,
    renameError: renameMutation.error,
    renameResult: renameMutation.data,
    resetRenameError: renameMutation.reset,
  };
}

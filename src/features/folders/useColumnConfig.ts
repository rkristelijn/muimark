"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ColumnConfigEntry {
  field: string;
  visible: boolean;
  width?: number;
}

export function useColumnConfig(folderId: string) {
  const queryClient = useQueryClient();

  const { data: columnConfig = [] } = useQuery<ColumnConfigEntry[]>({
    queryKey: ["columnConfig", folderId],
    queryFn: () =>
      fetch(`/api/columns/${folderId}`)
        .then((r) => r.json())
        .then((data) => data.columns ?? []),
  });

  const mutation = useMutation({
    mutationFn: (columns: ColumnConfigEntry[]) =>
      fetch(`/api/columns/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columnConfig", folderId] });
    },
  });

  return {
    columnConfig,
    updateColumnConfig: mutation.mutate,
    isSaving: mutation.isPending,
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnOrderState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Box,
  Chip,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import type { FileEntry } from "@/shared/lib/files";
import type { FolderDef } from "@/shared/lib/config";
import { useColumnConfig } from "./useColumnConfig";
import { ColumnConfigButton } from "./ColumnConfigButton";

interface FileGridProps {
  folderId: string;
  selectedFile: string | null;
  onSelectFile: (id: string) => void;
  searchFilter?: string;
}

interface FolderResponse {
  folder: FolderDef;
  files: FileEntry[];
}

const columnHelper = createColumnHelper<FileEntry>();

export function FileGrid({
  folderId,
  selectedFile,
  onSelectFile,
  searchFilter = "",
}: FileGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data, isLoading } = useQuery<FolderResponse>({
    queryKey: ["folder", folderId],
    queryFn: () => fetch(`/api/folders/${folderId}`).then((r) => r.json()),
  });

  const { columnConfig, updateColumnConfig } = useColumnConfig(folderId);

  // Sync column config from server into TanStack Table state
  useEffect(() => {
    if (columnConfig.length === 0) return;

    const order = columnConfig.map((c) => c.field);
    const visibility: VisibilityState = {};
    for (const c of columnConfig) {
      visibility[c.field] = c.visible;
    }

    setColumnOrder(order);
    setColumnVisibility(visibility);
  }, [columnConfig]);

  // Build columns from folder field definitions
  const columns = (() => {
    if (!data?.folder) return [];

    const baseCols = [
      columnHelper.accessor("id", {
        id: "id",
        header: "ID",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Title",
        cell: (info) => info.getValue(),
      }),
    ];

    const fieldCols = data.folder.fields.map((field) =>
      columnHelper.accessor((row) => row.frontmatter[field.name] as string, {
        id: field.name,
        header: field.label,
        cell: (info) => {
          const val = info.getValue();
          if (!val) return null;
          if (field.type === "select") {
            return <Chip label={val} size="small" variant="outlined" />;
          }
          return <span>{String(val)}</span>;
        },
      })
    );

    return [...baseCols, ...fieldCols];
  })();

  const table = useReactTable({
    data: data?.files ?? [],
    columns,
    state: {
      sorting,
      globalFilter: searchFilter,
      columnOrder,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Get all column definitions for the config button
  const allColumnDefs = table.getAllColumns().map((col) => ({
    field: col.id,
    headerName: (typeof col.columnDef.header === "string"
      ? col.columnDef.header
      : col.id) as string,
  }));

  if (isLoading) return <Box sx={{ p: 2 }}>Loading...</Box>;
  if (!data?.files.length)
    return <Box sx={{ p: 2 }}>No files in this folder</Box>;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pb: 1 }}>
        <ColumnConfigButton
          folderId={folderId}
          allColumns={allColumnDefs}
          columnConfig={columnConfig}
          onConfigChange={updateColumnConfig}
        />
      </Box>
      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id}>
                    {header.isPlaceholder ? null : (
                      <TableSortLabel
                        active={!!header.column.getIsSorted()}
                        direction={
                          header.column.getIsSorted() === "asc"
                            ? "asc"
                            : "desc"
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                selected={row.original.id === selectedFile}
                onClick={() => onSelectFile(row.original.id)}
                sx={{ cursor: "pointer" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={table.getFilteredRowModel().rows.length}
        page={table.getState().pagination.pageIndex}
        rowsPerPage={table.getState().pagination.pageSize}
        onPageChange={(_, page) => table.setPageIndex(page)}
        onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}

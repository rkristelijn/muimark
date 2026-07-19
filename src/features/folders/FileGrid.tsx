"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Box,
  Chip,
  Typography,
} from "@mui/material";
import { useState, useMemo } from "react";
import type { FileEntry } from "@/shared/lib/files";
import type { FolderDef } from "@/shared/lib/config";

interface FileGridProps {
  folderId: string;
  selectedFile: string | null;
  onSelectFile: (id: string) => void;
}

interface FolderResponse {
  folder: FolderDef;
  files: FileEntry[];
}

const columnHelper = createColumnHelper<FileEntry>();

export function FileGrid({ folderId, selectedFile, onSelectFile }: FileGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, isLoading } = useQuery<FolderResponse>({
    queryKey: ["folder", folderId],
    queryFn: () => fetch(`/api/folders/${folderId}`).then((r) => r.json()),
  });

  const columns = useMemo(() => {
    if (!data?.folder) return [];

    const cols = [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
      }),
      ...data.folder.fields.map((field) =>
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
      ),
    ];
    return cols;
  }, [data?.folder]);

  const table = useReactTable({
    data: data?.files ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) return <Box sx={{ p: 2 }}>Loading...</Box>;
  if (!data?.files.length) return <Box sx={{ p: 2 }}>No files in this folder</Box>;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          fullWidth
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
                        direction={header.column.getIsSorted() || undefined}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

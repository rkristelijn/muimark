"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useState } from "react";

interface SearchResult {
  folderId: string;
  folderLabel: string;
  fileId: string;
  displayId: string;
  title: string;
  snippet: string;
}

interface SearchResultsProps {
  query: string;
  onSelect: (folderId: string, fileId: string) => void;
  selectedFile?: string | null;
}

const columnHelper = createColumnHelper<SearchResult>();

const columns = [
  columnHelper.accessor("folderLabel", {
    header: "Folder",
    cell: (info) => <Chip label={info.getValue()} size="small" variant="outlined" />,
  }),
  columnHelper.accessor("displayId", {
    header: "ID",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("snippet", {
    header: "Match",
    cell: (info) => {
      const val = info.getValue();
      if (!val || val === info.row.original.title) return null;
      return (
        <Typography variant="caption" color="text.secondary" noWrap>
          {val}
        </Typography>
      );
    },
  }),
];

export function SearchResults({ query, onSelect, selectedFile }: SearchResultsProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading } = useQuery<{ results: SearchResult[] }>({
    queryKey: ["search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: query.length >= 2,
  });

  const results = data?.results ?? [];

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (query.length < 2) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">Type at least 2 characters to search</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return <LinearProgress />;
  }

  if (results.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No results for &quot;{query}&quot;</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1 }}>
        {results.length} result{results.length !== 1 ? "s" : ""} across all folders
      </Typography>
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
                        direction={header.column.getIsSorted() === "asc" ? "asc" : "desc"}
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
                selected={row.original.fileId === selectedFile}
                onClick={() => onSelect(row.original.folderId, row.original.fileId)}
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

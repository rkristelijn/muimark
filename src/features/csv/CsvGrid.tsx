"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type CellContext,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { CsvColumnMeta, CsvMeta } from "@/shared/lib/csv";

interface CsvRow extends Record<string, string> {}

interface CsvFileResponse {
  filename: string;
  meta: CsvMeta | null;
  headers: string[];
  rows: CsvRow[];
}

interface CsvGridProps {
  /** Relative path to CSV file from dataDir, e.g. "data/inventory.csv" */
  csvPath: string;
}

const columnHelper = createColumnHelper<CsvRow>();

/**
 * Evaluate a simple formula expression for a row.
 * Supports basic arithmetic: +, -, *, /, parentheses, and column references.
 */
function evaluateFormula(formula: string, row: CsvRow): string {
  try {
    // Replace column references with their numeric values
    let expr = formula;
    for (const [key, value] of Object.entries(row)) {
      // Replace column name with its value (word boundary match)
      const regex = new RegExp(`\\b${key}\\b`, "g");
      const numVal = parseFloat(value);
      expr = expr.replace(regex, isNaN(numVal) ? "0" : String(numVal));
    }

    // Safety: only allow numbers, operators, parens, dots, spaces
    if (!/^[\d\s+\-*/().]+$/.test(expr)) {
      return "#ERROR";
    }

    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && isFinite(result) ? String(result) : "#ERROR";
  } catch {
    return "#ERROR";
  }
}

/**
 * Format a numeric value according to a format string.
 * Supports: €#,##0.00, $#,##0.00, #,##0, 0.00
 */
function formatValue(value: string, format?: string): string {
  if (!format || value === "#ERROR") return value;

  const num = parseFloat(value);
  if (isNaN(num)) return value;

  // Extract currency prefix
  const currencyMatch = format.match(/^([€$£])/);
  const currency = currencyMatch?.[1] || "";

  // Determine decimals from format
  const decimalMatch = format.match(/\.(\d+|0+)$/);
  const decimals = decimalMatch?.[1] ? decimalMatch[1].length : 0;

  // Format number
  const formatted = num.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return currency ? `${currency} ${formatted}` : formatted;
}

/**
 * Inline editable cell for CSV data.
 */
function InlineEditCell({
  value,
  rowIndex,
  columnId,
  isFormula,
  format,
  onEdit,
}: {
  value: string;
  rowIndex: number;
  columnId: string;
  isFormula: boolean;
  format?: string;
  onEdit: (rowIndex: number, columnId: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (isFormula) {
    return (
      <Typography
        variant="body2"
        sx={{ fontStyle: "italic", color: "text.secondary" }}
      >
        {formatValue(value, format)}
      </Typography>
    );
  }

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        size="small"
        variant="standard"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (editValue !== value) {
            onEdit(rowIndex, columnId, editValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (editValue !== value) {
              onEdit(rowIndex, columnId, editValue);
            }
          }
          if (e.key === "Escape") {
            setEditing(false);
            setEditValue(value);
          }
        }}
        sx={{ minWidth: 60 }}
      />
    );
  }

  return (
    <Typography
      variant="body2"
      onDoubleClick={() => {
        setEditing(true);
        setEditValue(value);
      }}
      sx={{
        cursor: "text",
        "&:hover": { backgroundColor: "action.hover", borderRadius: 0.5 },
        px: 0.5,
        py: 0.25,
      }}
    >
      {formatValue(value, format)}
    </Typography>
  );
}

export function CsvGrid({ csvPath }: CsvGridProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localRows, setLocalRows] = useState<CsvRow[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const { data, isLoading, error } = useQuery<CsvFileResponse>({
    queryKey: ["csv", csvPath],
    queryFn: () => fetch(`/api/csv/${csvPath}`).then((r) => {
      if (!r.ok) throw new Error("Failed to load CSV");
      return r.json();
    }),
  });

  // Sync server data to local state
  useEffect(() => {
    if (data?.rows && !dirty) {
      setLocalRows(data.rows);
    }
  }, [data, dirty]);

  const saveMutation = useMutation({
    mutationFn: async (rows: CsvRow[]) => {
      const res = await fetch(`/api/csv/${csvPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => {
      setDirty(false);
      setSnackbar({ open: true, message: "Saved!", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["csv", csvPath] });
    },
    onError: () => {
      setSnackbar({ open: true, message: "Failed to save", severity: "error" });
    },
  });

  const handleEdit = useCallback((rowIndex: number, columnId: string, value: string) => {
    setLocalRows((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [columnId]: value };
      return updated;
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (localRows) {
      saveMutation.mutate(localRows);
    }
  }, [localRows, saveMutation]);

  // Build column metadata map
  const metaMap = new Map<string, CsvColumnMeta>();
  if (data?.meta?.columns) {
    for (const col of data.meta.columns) {
      metaMap.set(col.id, col);
    }
  }

  // Compute rows with formula columns evaluated
  const computedRows: CsvRow[] = useMemo(() => {
    return (localRows || []).map((row) => {
      const computed = { ...row };
      if (data?.meta?.columns) {
        for (const col of data.meta.columns) {
          if (col.type === "formula" && col.formula) {
            computed[col.id] = evaluateFormula(col.formula, row);
          }
        }
      }
      return computed;
    });
  }, [localRows, data?.meta?.columns]);

  // Build TanStack columns
  const columns = (() => {
    if (!data) return [];

    // Use meta columns if available, otherwise use CSV headers
    const colDefs = data.meta?.columns
      ? data.meta.columns
      : data.headers.map((h): CsvColumnMeta => ({ id: h, name: h, type: "text" }));

    return colDefs.map((col) =>
      columnHelper.accessor((row) => row[col.id] ?? "", {
        id: col.id,
        header: col.name,
        cell: (info: CellContext<CsvRow, string>) => (
          <InlineEditCell
            value={info.getValue()}
            rowIndex={info.row.index}
            columnId={col.id}
            isFormula={col.type === "formula"}
            format={col.format}
            onEdit={handleEdit}
          />
        ),
        size: col.width || 150,
      })
    );
  })();

  const table = useReactTable({
    data: computedRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) return <Box sx={{ p: 2 }}>Loading CSV...</Box>;
  if (error) return <Box sx={{ p: 2, color: "error.main" }}>Failed to load CSV file</Box>;
  if (!data) return null;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {data.meta?.sheet || data.filename}
        </Typography>
        {data.meta?.description && (
          <Typography variant="body2" color="text.secondary">
            — {data.meta.description}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Chip label={`${computedRows.length} rows`} size="small" variant="outlined" />
        {dirty && (
          <Tooltip title="Save changes (Ctrl+S)">
            <IconButton color="primary" onClick={handleSave} size="small">
              <SaveIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Table */}
      <TableContainer sx={{ flex: 1, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableCell sx={{ width: 50, fontWeight: 600, color: "text.secondary" }}>#</TableCell>
                {headerGroup.headers.map((header) => {
                  const meta = metaMap.get(header.id);
                  return (
                    <TableCell
                      key={header.id}
                      sx={{ width: meta?.width || 150 }}
                    >
                      <TableSortLabel
                        active={!!header.column.getIsSorted()}
                        direction={header.column.getIsSorted() === "asc" ? "asc" : "desc"}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {meta?.type === "formula" && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: "info.main" }}>
                            ƒ
                          </Typography>
                        )}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row, idx) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem" }}>{idx + 1}</TableCell>
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

      {/* Keyboard shortcut for save */}
      <KeyboardSaveHandler onSave={handleSave} enabled={dirty} />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** Listens for Ctrl+S to trigger save */
function KeyboardSaveHandler({ onSave, enabled }: { onSave: () => void; enabled: boolean }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (enabled) onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, enabled]);

  return null;
}

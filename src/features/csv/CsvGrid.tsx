"use client";

import { intlLocale } from "@/logic/time";
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
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { CsvColumnMeta, CsvMeta } from "@/shared/lib/csv";

type CsvRow = Record<string, string>;

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
  const formatted = num.toLocaleString(intlLocale, {
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
  formula,
  format,
  onEdit,
  onNavigateCell,
}: {
  value: string;
  rowIndex: number;
  columnId: string;
  isFormula: boolean;
  formula?: string;
  format?: string;
  onEdit: (rowIndex: number, columnId: string, value: string) => void;
  onNavigateCell?: (rowIndex: number, columnId: string, direction: 'left' | 'right' | 'up' | 'down') => void;
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

  // Sync external value changes
  useEffect(() => {
    if (!editing) setEditValue(value);
  }, [value, editing]);

  if (isFormula) {
    return (
      <Tooltip title={`ƒ = ${formula || 'formula'}`} placement="top" arrow>
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary", cursor: "help" }}
        >
          {formatValue(value, format)}
        </Typography>
      </Tooltip>
    );
  }

  const commitAndMove = (direction?: 'left' | 'right' | 'up' | 'down') => {
    setEditing(false);
    if (editValue !== value) {
      onEdit(rowIndex, columnId, editValue);
    }
    if (direction && onNavigateCell) {
      onNavigateCell(rowIndex, columnId, direction);
    }
  };

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        size="small"
        variant="standard"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => commitAndMove()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitAndMove('down');
          } else if (e.key === "Tab") {
            e.preventDefault();
            commitAndMove(e.shiftKey ? 'left' : 'right');
          } else if (e.key === "Escape") {
            setEditing(false);
            setEditValue(value);
          } else if (e.key === "ArrowUp" && e.ctrlKey) {
            e.preventDefault();
            commitAndMove('up');
          } else if (e.key === "ArrowDown" && e.ctrlKey) {
            e.preventDefault();
            commitAndMove('down');
          }
        }}
        sx={{ minWidth: 60, "& input": { py: 0.25, px: 0.5, fontSize: "0.875rem" } }}
      />
    );
  }

  return (
    <Box
      data-cell=""
      data-row={String(rowIndex)}
      data-col={columnId}
      onClick={() => {
        setEditing(true);
        setEditValue(value);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          setEditing(true);
          setEditValue(value);
        }
      }}
      sx={{
        cursor: "text",
        "&:hover": { backgroundColor: "action.hover", borderRadius: 0.5 },
        "&:focus": { outline: "2px solid", outlineColor: "primary.main", borderRadius: 0.5 },
        px: 0.5,
        py: 0.25,
        minHeight: 24,
      }}
    >
      <Typography variant="body2" component="span">
        {formatValue(value, format)}
      </Typography>
    </Box>
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

  const handleAddRow = useCallback(() => {
    setLocalRows((prev) => {
      if (!prev) return prev;
      // Create empty row with all headers
      const emptyRow: CsvRow = {};
      for (const h of data?.headers || []) {
        emptyRow[h] = "";
      }
      return [...prev, emptyRow];
    });
    setDirty(true);
  }, [data?.headers]);

  const handleDeleteRow = useCallback((rowIndex: number) => {
    setLocalRows((prev) => {
      if (!prev) return prev;
      return prev.filter((_, i) => i !== rowIndex);
    });
    setDirty(true);
  }, []);

  // Auto-save 2s after last edit
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || !localRows) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate(localRows);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, localRows]);

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
            formula={col.formula}
            format={col.format}
            onEdit={handleEdit}
            onNavigateCell={(row, colId, direction) => {
              // Find next focusable cell via DOM
              const table = document.querySelector('[data-csv-grid]');
              if (!table) return;
              const allCells = Array.from(table.querySelectorAll<HTMLElement>('[data-cell]'));
              const currentIdx = allCells.findIndex(
                (el) => el.dataset.row === String(row) && el.dataset.col === colId
              );
              if (currentIdx === -1) return;

              let targetIdx = currentIdx;
              const colCount = colDefs.filter((c) => c.type !== 'formula').length;
              if (direction === 'right') targetIdx = currentIdx + 1;
              else if (direction === 'left') targetIdx = currentIdx - 1;
              else if (direction === 'down') targetIdx = currentIdx + colCount;
              else if (direction === 'up') targetIdx = currentIdx - colCount;

              const target = allCells[targetIdx];
              if (target) target.click();
            }}
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
        <Tooltip title="Add row">
          <IconButton color="primary" onClick={handleAddRow} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>
        {dirty && (
          <Tooltip title="Save changes (Ctrl+S)">
            <IconButton color="primary" onClick={handleSave} size="small">
              <SaveIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Table */}
      <TableContainer sx={{ flex: 1, overflow: "auto" }} data-csv-grid="">
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
                <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem", p: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "text.disabled" }}>{idx + 1}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRow(idx)}
                      sx={{ opacity: 0.3, "&:hover": { opacity: 1 }, p: 0.25 }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </TableCell>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {/* Totals row */}
          <TableBody>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Σ</TableCell>
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const colMeta = metaMap.get(header.id);
                const isNumeric = colMeta?.type === "number" || colMeta?.type === "formula";
                if (!isNumeric) return <TableCell key={header.id} />;
                const sum = computedRows.reduce((acc, row) => {
                  const val = parseFloat(row[header.id] ?? "0");
                  return acc + (isNaN(val) ? 0 : val);
                }, 0);
                return (
                  <TableCell key={header.id} sx={{ fontWeight: 600 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatValue(String(sum), colMeta?.format)}
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
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

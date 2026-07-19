"use client";

import { useState, useEffect } from "react";
import {
  Chip,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
} from "@mui/material";
import type { FieldDef } from "@/shared/lib/config";
import { getOptionColor, normalizeOptions } from "@/shared/lib/field-options";

interface EditableCellProps {
  value: string | undefined;
  field: FieldDef;
  fileId: string;
  folderId: string;
  isActive: boolean;
  onSave: (fileId: string, fieldName: string, value: string) => void;
}

export function EditableCell({ value, field, isActive, fileId, onSave }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value || "");

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  // Read-only mode
  if (!isActive) {
    return value ? (
      field.type === "select" ? (
        <Chip
          label={value}
          size="small"
          variant="outlined"
          color={getOptionColor(field.options, value) || "default"}
        />
      ) : (
        <span>{value}</span>
      )
    ) : (
      <span style={{ opacity: 0.3 }}>—</span>
    );
  }

  // Edit mode — select
  if (field.type === "select" && field.options) {
    const opts = normalizeOptions(field.options);
    return (
      <Select
        size="small"
        value={localValue}
        onChange={(e: SelectChangeEvent) => {
          const newVal = e.target.value;
          setLocalValue(newVal);
          onSave(fileId, field.name, newVal);
        }}
        onClick={(e) => e.stopPropagation()}
        sx={{ minWidth: 100 }}
        variant="standard"
      >
        {opts.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.value}
          </MenuItem>
        ))}
      </Select>
    );
  }

  // Edit mode — text/date
  return (
    <TextField
      size="small"
      type={field.type === "date" ? "date" : "text"}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== (value || "")) {
          onSave(fileId, field.name, localValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (localValue !== (value || "")) {
            onSave(fileId, field.name, localValue);
          }
        }
      }}
      onClick={(e) => e.stopPropagation()}
      variant="standard"
      sx={{ minWidth: 80 }}
    />
  );
}

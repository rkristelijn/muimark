"use client";

import { useState } from "react";
import {
  Chip,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
} from "@mui/material";
import type { FieldDef } from "@/shared/lib/config";

interface EditableCellProps {
  value: string | undefined;
  field: FieldDef;
  fileId: string;
  folderId: string;
  onSave: (fileId: string, fieldName: string, value: string) => void;
}

export function EditableCell({ value, field, fileId, folderId, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  if (!editing) {
    return (
      <span
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        style={{ cursor: "pointer", minWidth: 40, display: "inline-block" }}
      >
        {value ? (
          field.type === "select" ? (
            <Chip label={value} size="small" variant="outlined" />
          ) : (
            <span>{value}</span>
          )
        ) : (
          <span style={{ opacity: 0.3 }}>—</span>
        )}
      </span>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <Select
        size="small"
        value={localValue}
        autoFocus
        open
        onChange={(e: SelectChangeEvent) => {
          const newVal = e.target.value;
          setLocalValue(newVal);
          setEditing(false);
          onSave(fileId, field.name, newVal);
        }}
        onClose={() => setEditing(false)}
        onClick={(e) => e.stopPropagation()}
        sx={{ minWidth: 100 }}
      >
        {field.options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    );
  }

  // Text or date input
  return (
    <TextField
      size="small"
      type={field.type === "date" ? "date" : "text"}
      value={localValue}
      autoFocus
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (localValue !== (value || "")) {
          onSave(fileId, field.name, localValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          if (localValue !== (value || "")) {
            onSave(fileId, field.name, localValue);
          }
        }
        if (e.key === "Escape") {
          setLocalValue(value || "");
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      sx={{ minWidth: 100 }}
    />
  );
}

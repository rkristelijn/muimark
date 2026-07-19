/** Field option with optional color */
export interface FieldOption {
  value: string;
  color?: "error" | "warning" | "info" | "success" | "default";
}

/** Normalize options to always return FieldOption[] */
export function normalizeOptions(options?: (string | FieldOption)[]): FieldOption[] {
  if (!options) return [];
  return options.map((opt) =>
    typeof opt === "string" ? { value: opt } : opt
  );
}

/** Get color for a value from field options */
export function getOptionColor(
  options: (string | FieldOption)[] | undefined,
  value: string
): FieldOption["color"] {
  const opts = normalizeOptions(options);
  const match = opts.find((o) => o.value.toLowerCase() === value.toLowerCase());
  return match?.color;
}

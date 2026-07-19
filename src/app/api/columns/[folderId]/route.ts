import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

interface ColumnEntry {
  field: string;
  visible: boolean;
  width?: number;
}

interface ItsmConfig {
  dataDir: string;
  folders: unknown[];
  columnConfig?: Record<string, ColumnEntry[]>;
}

function getConfigPath(): string {
  return path.join(process.cwd(), ".config", "itsm.yaml");
}

function readConfig(): ItsmConfig {
  const raw = fs.readFileSync(getConfigPath(), "utf-8");
  return yaml.load(raw) as ItsmConfig;
}

function writeConfig(config: ItsmConfig): void {
  const raw = yaml.dump(config, {
    lineWidth: 120,
    noRefs: true,
  });
  fs.writeFileSync(getConfigPath(), raw, "utf-8");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const config = readConfig();
    const columns = config.columnConfig?.[folderId] ?? [];
    return NextResponse.json({ columns });
  } catch {
    return NextResponse.json({ error: "Failed to read column config" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const body = await request.json();
    const columns: ColumnEntry[] = body.columns;

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: "columns must be an array" }, { status: 400 });
    }

    // Validate entries
    for (const col of columns) {
      if (typeof col.field !== "string" || typeof col.visible !== "boolean") {
        return NextResponse.json(
          { error: "Each column must have field (string) and visible (boolean)" },
          { status: 400 }
        );
      }
    }

    const config = readConfig();
    if (!config.columnConfig) {
      config.columnConfig = {};
    }
    config.columnConfig[folderId] = columns;
    writeConfig(config);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save column config" }, { status: 500 });
  }
}

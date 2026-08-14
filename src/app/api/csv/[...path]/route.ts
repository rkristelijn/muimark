import { NextResponse } from "next/server";
import { loadCsvFile, saveCsvFile } from "@/shared/lib/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const relativePath = segments.join("/");

    if (!relativePath.endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files supported" }, { status: 400 });
    }

    const csvFile = loadCsvFile(relativePath);
    return NextResponse.json(csvFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load CSV";
    const status = message.includes("not found") ? 404 : message.includes("traversal") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const relativePath = segments.join("/");

    if (!relativePath.endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files supported" }, { status: 400 });
    }

    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
    }

    saveCsvFile(relativePath, rows);
    return NextResponse.json({ ok: true, message: `Saved ${relativePath}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save CSV";
    const status = message.includes("traversal") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

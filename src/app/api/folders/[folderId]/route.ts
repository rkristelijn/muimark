import { NextResponse } from "next/server";
import { listFiles, createFile } from "@/lib/files";
import { getFolderDef } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const folder = getFolderDef(folderId);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const files = listFiles(folderId);
    return NextResponse.json({ folder, files });
  } catch {
    return NextResponse.json({ error: "Failed to load folder" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const folder = getFolderDef(folderId);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, fields } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = createFile(folderId, title.trim(), fields);
    return NextResponse.json({ id, message: `Created ${id}` }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

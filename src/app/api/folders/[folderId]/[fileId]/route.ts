import { NextResponse } from "next/server";
import { getFile, saveFile } from "@/lib/files";
import { getFolderDef } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string; fileId: string }> }
) {
  const { folderId, fileId } = await params;
  const file = getFile(folderId, fileId);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json(file);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ folderId: string; fileId: string }> }
) {
  const { folderId, fileId } = await params;
  const folder = getFolderDef(folderId);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const body = await request.json();
  const { frontmatter, content } = body;

  if (!content && content !== "") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  saveFile(folderId, fileId, frontmatter || {}, content);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getFile, saveFile } from "@/shared/lib/files";
import { getFolderDef, getAbsolutePath } from "@/shared/lib/config";
import { indexRelations } from "@/shared/lib/relations";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string; fileId: string }> }
) {
  try {
    const { folderId, fileId } = await params;
    const file = getFile(folderId, fileId);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(file);
  } catch {
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ folderId: string; fileId: string }> }
) {
  try {
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

    // Index relations: scan for #ID references and update targets
    if (folder.idPattern) {
      const idRegex = new RegExp(folder.idPattern, "i");
      const idMatch = fileId.match(idRegex);
      const displayId = idMatch?.[1]?.toUpperCase();
      if (displayId) {
        const filePath = path.join(getAbsolutePath(folder.path), `${fileId}.md`);
        try {
          indexRelations(displayId, content, filePath);
        } catch {
          // Non-critical: don't fail the save if indexing fails
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

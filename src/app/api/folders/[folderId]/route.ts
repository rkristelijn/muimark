import { NextResponse } from "next/server";
import { listFiles, createFile } from "@/shared/lib/files";
import { getFolderDef } from "@/shared/lib/config";
import { getGitMetaBatch } from "@/shared/lib/git-meta";

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

    // Batch fetch git metadata
    const filenames = files.map((f) => f.filename);
    const gitMeta = getGitMetaBatch(folder.path, filenames);

    const filesWithGit = files.map((f) => ({
      ...f,
      git: gitMeta[f.filename] || null,
    }));

    return NextResponse.json({ folder, files: filesWithGit });
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

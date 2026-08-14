import { NextResponse } from "next/server";
import { listFiles, createFile, deleteFolder, renameFolder } from "@/shared/lib/files";
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

    // CSV folders don't have markdown files — return folder info only
    if (folder.type === "csv") {
      return NextResponse.json({ folder, files: [] });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const folder = getFolderDef(folderId);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    deleteFolder(folderId);
    return NextResponse.json({ ok: true, message: `Deleted folder ${folderId}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete folder";
    const status = message.includes("not found") ? 404 : message.includes("not empty") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
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
    const { newName } = body;

    if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
      return NextResponse.json({ error: "newName is required" }, { status: 400 });
    }

    const newPath = renameFolder(folderId, newName.trim());
    const newId = newPath.replace(/\//g, "--");
    return NextResponse.json({ ok: true, newId, newPath, message: `Renamed to ${newName}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rename folder";
    const status = message.includes("not found") ? 404 : message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

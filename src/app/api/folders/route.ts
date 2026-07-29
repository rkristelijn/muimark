import { NextResponse } from "next/server";
import { listFolders, getTree, createFolder } from "@/shared/lib";

export async function GET() {
  try {
    const folders = listFolders();
    const tree = getTree();
    return NextResponse.json({ folders, tree });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path: folderPath } = body;

    if (!folderPath || typeof folderPath !== "string" || folderPath.trim().length === 0) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const createdPath = createFolder(folderPath.trim());
    const id = createdPath.replace(/\//g, "--");
    return NextResponse.json({ id, path: createdPath, message: `Created folder ${createdPath}` }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

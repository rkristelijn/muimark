import { NextResponse } from "next/server";
import { listFiles } from "@/lib/files";
import { getFolderDef } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;
  const folder = getFolderDef(folderId);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const files = listFiles(folderId);
  return NextResponse.json({ folder, files });
}

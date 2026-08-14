import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getFolderDef, getAbsolutePath } from "@/config/loader";

// @feature F-032 Image serving — serve uploaded images via API

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    // URL format: /api/images/<folderId>/<imageFilename>
    if (segments.length < 2) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const [folderId, ...fileSegments] = segments;
    const imageFilename = fileSegments.join("/");

    const folder = getFolderDef(folderId!);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const folderPath = path.resolve(getAbsolutePath(folder.path));
    const filePath = path.resolve(path.join(folderPath, imageFilename));

    // Prevent directory traversal
    if (!filePath.startsWith(folderPath + path.sep) && filePath !== folderPath) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only serve image files
    const ext = path.extname(filePath).toLowerCase();
    if (!MIME[ext]) {
      return NextResponse.json({ error: "Not an image" }, { status: 403 });
    }

    await stat(filePath);

    const buffer = await readFile(filePath);
    const contentType = MIME[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

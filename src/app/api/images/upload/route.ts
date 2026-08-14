import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getConfig, getFolderDef, getAbsolutePath } from "@/config/loader";

// @feature F-030 Image paste — upload handler

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const fileId = formData.get("fileId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!folderId || !fileId) {
      return NextResponse.json(
        { error: "folderId and fileId are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const folder = getFolderDef(folderId);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const folderPath = getAbsolutePath(folder.path);
    await mkdir(folderPath, { recursive: true });

    // Image filename: <fileId>.<sanitized-original-name>
    // e.g. I-012-keyboard-fix.screenshot.png
    const ext = path.extname(file.name) || ".png";
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uuid = crypto.randomUUID().slice(0, 4);
    const imageFilename = `${fileId}.${baseName}-${uuid}${ext}`;
    const filePath = path.join(folderPath, imageFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Return relative path (relative to the markdown file in same folder)
    return NextResponse.json({
      url: `/api/images/${folderId}/${imageFilename}`,
    });
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

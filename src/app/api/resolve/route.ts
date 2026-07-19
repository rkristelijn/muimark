import { NextResponse } from "next/server";
import { getConfig } from "@/shared/lib/config";
import { listFiles } from "@/shared/lib/files";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const displayId = searchParams.get("id")?.toUpperCase().trim();

    if (!displayId) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const config = getConfig();

    for (const folder of config.folders) {
      if (!folder.idPattern) continue;

      const idRegex = new RegExp(folder.idPattern, "i");
      if (!idRegex.test(displayId)) continue;

      // This folder's pattern matches — search for the file
      const files = listFiles(folder.id);
      const match = files.find((f) => f.displayId.toUpperCase() === displayId);

      if (match) {
        return NextResponse.json({
          folderId: folder.id,
          fileId: match.id,
          displayId: match.displayId,
          title: match.title,
        });
      }
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}

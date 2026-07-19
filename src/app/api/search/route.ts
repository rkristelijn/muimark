import { NextResponse } from "next/server";
import { getConfig } from "@/shared/lib/config";
import { listFiles } from "@/shared/lib/files";

export interface SearchResult {
  folderId: string;
  folderLabel: string;
  fileId: string;
  displayId: string;
  title: string;
  snippet: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const config = getConfig();
    const results: SearchResult[] = [];

    for (const folder of config.folders) {
      const files = listFiles(folder.id);

      for (const file of files) {
        // Search in id, displayId, title, and frontmatter values
        const searchable = [
          file.id,
          file.displayId,
          file.title,
          ...Object.values(file.frontmatter).map((v) => String(v ?? "")),
        ].join(" ").toLowerCase();

        if (searchable.includes(query)) {
          // Build snippet from matching fields
          let snippet = "";
          if (file.title.toLowerCase().includes(query)) {
            snippet = file.title;
          } else {
            const matchingField = Object.entries(file.frontmatter).find(
              ([, v]) => String(v ?? "").toLowerCase().includes(query)
            );
            if (matchingField) {
              snippet = `${matchingField[0]}: ${matchingField[1]}`;
            }
          }

          results.push({
            folderId: folder.id,
            folderLabel: folder.label,
            fileId: file.id,
            displayId: file.displayId,
            title: file.title,
            snippet,
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

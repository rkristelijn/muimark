import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConfig } from "@/shared/lib/config";

export async function GET() {
  try {
    const config = getConfig();
    const readmePath = path.join(config.dataDir, "README.md");

    // Extract project title: H1 from README or basename of dataDir
    const fallbackTitle = path.basename(config.dataDir);

    if (!fs.existsSync(readmePath)) {
      return NextResponse.json({ content: null, title: fallbackTitle });
    }

    const content = fs.readFileSync(readmePath, "utf-8");
    const h1Match = content.match(/^#\s+(.+)$/m);
    const title = h1Match?.[1] || fallbackTitle;

    return NextResponse.json({ content, title });
  } catch {
    return NextResponse.json({ content: null, title: "ITSM" });
  }
}

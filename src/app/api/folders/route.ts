import { NextResponse } from "next/server";
import { listFolders, getTree } from "@/shared/lib";

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

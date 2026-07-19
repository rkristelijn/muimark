import { NextResponse } from "next/server";
import { listFolders } from "@/lib/files";

export async function GET() {
  try {
    const folders = listFolders();
    return NextResponse.json(folders);
  } catch {
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}

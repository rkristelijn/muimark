import { NextResponse } from "next/server";
import { listFolders } from "@/lib/files";

export async function GET() {
  const folders = listFolders();
  return NextResponse.json(folders);
}

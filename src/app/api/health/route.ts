import { NextResponse } from 'next/server';
import { getConfig } from '@/shared/lib/config';

export async function GET() {
  const start = Date.now();

  try {
    const config = await getConfig();
    const folderCount = config.folders.length;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
      folders: folderCount,
      responseMs: Date.now() - start,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}

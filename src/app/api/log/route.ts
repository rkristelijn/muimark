import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { level, message, stack, url, timestamp } = await request.json();
    const prefix = `[browser:${level || 'error'}]`;
    const location = url ? ` (${url})` : '';
    console.error(`${prefix} ${message}${location}`);
    if (stack) {
      console.error(`  ${stack.split('\n').slice(0, 3).join('\n  ')}`);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

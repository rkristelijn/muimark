import { NextResponse } from 'next/server';
import { clearConfigCache } from '@/shared/lib/config';

export async function POST() {
  clearConfigCache();
  return NextResponse.json({ ok: true, message: 'Config cache cleared' });
}

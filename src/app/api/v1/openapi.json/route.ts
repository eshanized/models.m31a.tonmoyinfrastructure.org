export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi';

export async function GET() {
  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

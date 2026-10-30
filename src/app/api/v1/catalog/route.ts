export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { getCatalogMetadata, getAllModels } from '@/lib/catalog';

export async function GET() {
  const metadata = getCatalogMetadata();
  const models = getAllModels();

  return NextResponse.json(
    {
      ...metadata,
      models,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}

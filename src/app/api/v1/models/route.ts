import { NextRequest, NextResponse } from 'next/server';
import { queryModels, ModelFilterParams } from '@/lib/catalog';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const params: ModelFilterParams = {
    query: searchParams.get('query') || undefined,
    publisher: searchParams.get('publisher') || undefined,
    modality: searchParams.get('modality') || undefined,
    access: searchParams.get('access') || undefined,
    capability: searchParams.get('capability') || undefined,
    minContext: searchParams.get('minContext') ? parseInt(searchParams.get('minContext')!, 10) : undefined,
    maxContext: searchParams.get('maxContext') ? parseInt(searchParams.get('maxContext')!, 10) : undefined,
    priceOnly: searchParams.get('priceOnly') === 'true',
    probeEligibleOnly: searchParams.get('probeEligibleOnly') === 'true',
    sort: (searchParams.get('sort') as any) || 'name',
    order: (searchParams.get('order') as any) || 'asc',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20,
  };

  const results = queryModels(params);

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    },
  });
}

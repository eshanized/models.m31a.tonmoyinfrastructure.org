import { NextResponse } from 'next/server';
import { getCatalogMetadata } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';

export async function GET() {
  const meta = getCatalogMetadata();
  const dbConnected = StatusRepository.isAvailable();

  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'models.m31a.tonmoyinfrastructure.org',
      version: '1.0.0',
      catalog: {
        total_models: meta.total_models,
        publishers_count: meta.publishers.length,
        last_synced_at: meta.last_synced_at,
        schema_version: meta.schema_version,
      },
      persistence: {
        database_configured: dbConnected,
        mode: dbConnected ? 'postgresql_persistent' : 'static_catalog_only',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      },
    }
  );
}

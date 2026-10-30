export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { getAllModels, getCatalogMetadata } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ObservedHealthStatus } from '@/lib/types/registry';

export async function GET() {
  const metadata = getCatalogMetadata();
  const models = getAllModels();
  const modelIds = models.map((m) => m.id);

  // Read latest observations from DB if available
  const obsMap = await StatusRepository.getLatestObservationsForModels(modelIds, 5);

  const statusCounts: Record<ObservedHealthStatus, number> = {
    operational: 0,
    degraded: 0,
    unavailable: 0,
    unknown: 0,
    stale: 0,
    catalog_only: 0,
    downloadable_only: 0,
  };

  const publisherCounts: Record<string, number> = {};
  const modalityCounts: Record<string, number> = {};

  for (const m of models) {
    // Publisher counts
    publisherCounts[m.publisher] = (publisherCounts[m.publisher] || 0) + 1;

    // Modality counts
    for (const mod of m.input_modalities) {
      modalityCounts[mod] = (modalityCounts[mod] || 0) + 1;
    }

    // Health derivation
    const obs = obsMap.get(m.id) || [];
    const derived = deriveModelStatus(
      obs,
      m.eligibility.probe_eligible,
      m.access_classification === 'downloadable'
    );
    statusCounts[derived.status] = (statusCounts[derived.status] || 0) + 1;
  }

  // Get recent monitoring cycles
  const recentCycles = await StatusRepository.getRecentCycles(5);

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      catalog: {
        total_models: models.length,
        last_synced_at: metadata.last_synced_at,
        schema_version: metadata.schema_version,
      },
      status_distribution: statusCounts,
      publisher_distribution: publisherCounts,
      modality_distribution: modalityCounts,
      recent_monitoring_cycles: recentCycles,
      database_persisted: StatusRepository.isAvailable(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
      },
    }
  );
}

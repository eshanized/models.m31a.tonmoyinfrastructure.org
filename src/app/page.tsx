import { getAllModels, getCatalogMetadata } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ObservedHealthStatus } from '@/lib/types/registry';
import { HomepageClient } from '@/components/dashboard/homepage-client';

export const revalidate = 60; // revalidate every 60s

export default async function HomePage() {
  const meta = getCatalogMetadata();
  const models = getAllModels();
  const dbConnected = StatusRepository.isAvailable();

  // Read observations if database is available
  const modelIds = models.map((m) => m.id);
  const obsMap = await StatusRepository.getLatestObservationsForModels(modelIds, 5);
  const recentCycles = await StatusRepository.getRecentCycles(5);

  const statusDistribution: Record<ObservedHealthStatus, number> = {
    operational: 0,
    degraded: 0,
    unavailable: 0,
    unknown: 0,
    stale: 0,
    catalog_only: 0,
    downloadable_only: 0,
  };

  const publisherMap: Record<string, number> = {};
  const modalityMap: Record<string, number> = {};

  for (const m of models) {
    publisherMap[m.publisher] = (publisherMap[m.publisher] || 0) + 1;

    for (const mod of m.input_modalities) {
      modalityMap[mod] = (modalityMap[mod] || 0) + 1;
    }

    const obs = obsMap.get(m.id) || [];
    const derived = deriveModelStatus(
      obs,
      m.eligibility.probe_eligible,
      m.access_classification === 'downloadable'
    );
    statusDistribution[derived.status] = (statusDistribution[derived.status] || 0) + 1;
  }

  const publisherCounts = Object.entries(publisherMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const modalityCounts = Object.entries(modalityMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <HomepageClient
      totalModels={models.length}
      lastSyncedAt={meta.last_synced_at}
      schemaVersion={meta.schema_version}
      publishers={meta.publishers}
      statusDistribution={statusDistribution}
      publisherCounts={publisherCounts}
      modalityCounts={modalityCounts}
      recentModels={models}
      dbConnected={dbConnected}
      recentCyclesCount={recentCycles.length}
    />
  );
}

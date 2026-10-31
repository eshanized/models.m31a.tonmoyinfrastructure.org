import { getAllModels, getCatalogMetadata } from '@/lib/catalog';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ObservedHealthStatus } from '@/lib/types/registry';
import { HomepageClient } from '@/components/dashboard/homepage-client';
import {
  getLatestObservationsForModels,
  getObservabilityDocument,
  getObservabilityFreshness,
} from '@/lib/observability';

export default function HomePage() {
  const meta = getCatalogMetadata();
  const models = getAllModels();
  const modelIds = models.map((model) => model.id);
  const observations = getLatestObservationsForModels(modelIds, 10);
  const document = getObservabilityDocument();
  const freshness = getObservabilityFreshness();

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

  for (const model of models) {
    publisherMap[model.publisher] = (publisherMap[model.publisher] || 0) + 1;
    for (const modality of new Set([...model.input_modalities, ...model.output_modalities])) {
      modalityMap[modality] = (modalityMap[modality] || 0) + 1;
    }

    const result = deriveModelStatus(
      observations.get(model.id) || [],
      model.eligibility.probe_eligible,
      model.access_classification === 'downloadable',
    );
    statusDistribution[result.status] += 1;
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
      monitoringAvailable={freshness.available}
      monitoringFresh={freshness.fresh}
      lastProbeAt={document.last_successful_cycle_at}
      recentCyclesCount={document.recent_cycles.length}
    />
  );
}

import React, { Suspense } from 'react';
import { getAllModels, getCatalogMetadata } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ObservedHealthStatus } from '@/lib/types/registry';
import { ModelExplorer } from '@/components/models/model-explorer';

export const metadata = {
  title: 'Models Explorer | NVIDIA Build Intelligence',
  description:
    'Search, filter, and inspect foundation models across NVIDIA Build catalog. Verified specifications, context limits, and pricing.',
};

export default async function ModelsPage() {
  const models = getAllModels();
  const meta = getCatalogMetadata();

  // Read observations if database is available
  const modelIds = models.map((m) => m.id);
  const obsMap = await StatusRepository.getLatestObservationsForModels(modelIds, 5);

  const statusMap: Record<string, { status: ObservedHealthStatus; latencyMs: number | null }> = {};

  for (const m of models) {
    const obs = obsMap.get(m.id) || [];
    const derived = deriveModelStatus(
      obs,
      m.eligibility.probe_eligible,
      m.access_classification === 'downloadable'
    );
    statusMap[m.id] = {
      status: derived.status,
      latencyMs: derived.averageLatencyMs,
    };
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
          Loading canonical model directory...
        </div>
      }
    >
      <ModelExplorer
        initialModels={models}
        publishers={meta.publishers}
        statusMap={statusMap}
      />
    </Suspense>
  );
}

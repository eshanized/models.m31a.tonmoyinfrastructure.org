import React, { Suspense } from 'react';
import { getAllModels, getCatalogMetadata } from '@/lib/catalog';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ObservedHealthStatus } from '@/lib/types/registry';
import { getObservationsForModel } from '@/lib/observability';
import { ModelExplorer } from '@/components/models/model-explorer';

export const metadata = {
  title: 'Models Explorer | NVIDIA Build Intelligence',
  description: 'Search, filter, and inspect NVIDIA Build models with verified specifications and observed endpoint status.',
};

export default function ModelsPage() {
  const models = getAllModels();
  const meta = getCatalogMetadata();
  const statusMap: Record<string, { status: ObservedHealthStatus; latencyMs: number | null }> = {};

  for (const model of models) {
    const status = deriveModelStatus(
      getObservationsForModel(model.id, 10),
      model.eligibility.probe_eligible,
      model.access_classification === 'downloadable',
    );
    statusMap[model.id] = { status: status.status, latencyMs: status.averageLatencyMs };
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading canonical model directory...</div>}>
      <ModelExplorer initialModels={models} publishers={meta.publishers} statusMap={statusMap} />
    </Suspense>
  );
}

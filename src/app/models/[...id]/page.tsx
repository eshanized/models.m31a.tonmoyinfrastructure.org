import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getModelById, getAllModels } from '@/lib/catalog';
import { deriveModelStatus } from '@/lib/status/classifier';
import { getObservationsForModel } from '@/lib/observability';
import { ModelDetailClient } from '@/components/models/model-detail-client';

interface PageProps {
  params: Promise<{ id: string[] }>;
}

export async function generateStaticParams() {
  return getAllModels().map((model) => ({ id: model.id.split('/') }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const rawId = (resolved.id || []).join('/');
  const model = getModelById(rawId);
  if (!model) return { title: 'Model Not Found' };

  return {
    title: `${model.name} (${model.id}) | Specifications & Availability`,
    description: `Inspect verified specifications and observed synthetic endpoint status for ${model.name} on NVIDIA Build.`,
    openGraph: {
      title: `${model.name} - NVIDIA Build Model Intelligence`,
      description: model.description,
      url: `https://models.m31a.tonmoyinfrastructure.org/models/${encodeURIComponent(model.id)}`,
    },
  };
}

export default async function ModelDetailPage({ params }: PageProps) {
  const resolved = await params;
  const rawId = (resolved.id || []).join('/');
  const model = getModelById(rawId);
  if (!model) notFound();

  const observations = getObservationsForModel(model.id, 20);
  const statusInfo = deriveModelStatus(
    observations,
    model.eligibility.probe_eligible,
    model.access_classification === 'downloadable',
  );

  return (
    <ModelDetailClient
      model={model}
      observedStatus={statusInfo}
      observations={observations.map((observation) => ({
        timestamp: observation.timestamp,
        status: observation.status,
        resultCategory: observation.resultCategory,
        latencyMs: observation.latencyMs,
        ttftMs: observation.ttftMs,
        tokensOut: observation.tokensOut,
        tokensPerSec: observation.tokensPerSec,
        httpStatus: observation.httpStatus,
        failureCategory: observation.failureCategory,
      }))}
    />
  );
}

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getModelById, getAllModels } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { deriveModelStatus } from '@/lib/status/classifier';
import { ModelDetailClient } from '@/components/models/model-detail-client';

interface PageProps {
  params: Promise<{ id: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const rawId = (resolved.id || []).join('/');
  const model = getModelById(rawId);

  if (!model) {
    return {
      title: 'Model Not Found',
    };
  }

  return {
    title: `${model.name} (${model.id}) | Specifications & Availability`,
    description: `Inspect context window, pricing, capabilities, and synthetic response latency for ${model.name} on NVIDIA Build.`,
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

  if (!model) {
    notFound();
  }

  const observations = await StatusRepository.getObservationsForModel(model.id, 20);
  const statusInfo = deriveModelStatus(
    observations,
    model.eligibility.probe_eligible,
    model.access_classification === 'downloadable'
  );

  return (
    <ModelDetailClient
      model={model}
      observedStatus={statusInfo}
      observations={observations.map((o) => ({
        timestamp: o.timestamp,
        status: o.status,
        resultCategory: o.resultCategory,
        latencyMs: o.latencyMs,
        ttftMs: o.ttftMs,
        tokensOut: o.tokensOut,
        tokensPerSec: o.tokensPerSec,
        httpStatus: o.httpStatus,
        failureCategory: o.failureCategory,
      }))}
    />
  );
}

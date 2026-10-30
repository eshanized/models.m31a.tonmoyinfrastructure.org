import { NextRequest, NextResponse } from 'next/server';
import { getModelById, getAllModels } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { deriveModelStatus } from '@/lib/status/classifier';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const models = getAllModels();
  const params: Array<{ id: string[] }> = [];
  for (const m of models) {
    const parts = m.id.split('/');
    params.push({ id: parts });
    params.push({ id: [...parts, 'status'] });
    params.push({ id: [...parts, 'history'] });
  }
  return params;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  const resolvedParams = await params;
  const segments = resolvedParams.id || [];

  if (segments.length === 0) {
    return NextResponse.json({ error: 'Model identifier is required' }, { status: 400 });
  }

  // Check if sub-resource was requested (e.g. /status or /history)
  let subAction: 'detail' | 'status' | 'history' = 'detail';
  let modelSegments = [...segments];

  const last = segments[segments.length - 1];
  if (last === 'status' || last === 'history') {
    subAction = last;
    modelSegments = segments.slice(0, segments.length - 1);
  }

  const modelId = modelSegments.join('/');
  const model = getModelById(modelId);

  if (!model) {
    return NextResponse.json(
      {
        error: `Model '${modelId}' not found in canonical registry`,
        hint: 'Use GET /api/v1/models to list all available models',
      },
      { status: 404 }
    );
  }

  // Sub-action: /status
  if (subAction === 'status') {
    const observations = await StatusRepository.getObservationsForModel(model.id, 10);
    const classified = deriveModelStatus(
      observations,
      model.eligibility.probe_eligible,
      model.access_classification === 'downloadable'
    );

    return NextResponse.json(
      {
        model_id: model.id,
        current_status: classified.status,
        status_reason: classified.reason,
        is_stale: classified.isStale,
        sample_count: classified.sampleCount,
        average_latency_ms: classified.averageLatencyMs,
        success_rate: classified.successRate,
        last_observed_at: classified.lastObservedAt,
        probe_eligible: model.eligibility.probe_eligible,
        db_persisted: StatusRepository.isAvailable(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
      }
    );
  }

  // Sub-action: /history
  if (subAction === 'history') {
    const observations = await StatusRepository.getObservationsForModel(model.id, 50);

    return NextResponse.json(
      {
        model_id: model.id,
        count: observations.length,
        observations: observations.map((o) => ({
          timestamp: o.timestamp,
          status: o.status,
          result_category: o.resultCategory,
          latency_ms: o.latencyMs,
          ttft_ms: o.ttftMs,
          tokens_out: o.tokensOut,
          tokens_per_sec: o.tokensPerSec,
          http_status: o.httpStatus,
          failure_category: o.failureCategory,
          provenance: o.provenance,
        })),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
      }
    );
  }

  // Default: Return full model detail with latest status
  const observations = await StatusRepository.getObservationsForModel(model.id, 5);
  const statusInfo = deriveModelStatus(
    observations,
    model.eligibility.probe_eligible,
    model.access_classification === 'downloadable'
  );

  return NextResponse.json(
    {
      ...model,
      observed_status: statusInfo,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    }
  );
}

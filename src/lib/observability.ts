import snapshot from '../data/observability.json';
import type { ModelObservation } from './db/schema';
import type { CanonicalModel } from './types/registry';
import { deriveModelStatus, DEFAULT_STATUS_CONFIG } from './status/classifier';
import { ObservabilityDocumentSchema } from './observability-contract';

const document = ObservabilityDocumentSchema.parse(snapshot);

export function getObservabilityDocument() {
  return document;
}

export function getObservationsForModel(modelId: string, limit = 30): ModelObservation[] {
  return document.observations
    .filter((item) => item.model_id === modelId)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit)
    .map((item, index) => ({
      id: index + 1,
      modelId: item.model_id,
      status: item.status,
      resultCategory: item.result_category,
      timestamp: item.timestamp,
      probeType: 'synthetic_canary',
      region: item.region,
      latencyMs: item.latency_ms,
      ttftMs: item.ttft_ms,
      tokensOut: item.tokens_out,
      tokensPerSec: item.tokens_per_second,
      failureCategory: item.failure_category,
      errorMessage: item.error_message,
      httpStatus: item.http_status,
      provenance: 'm31a_synthetic_worker',
      runId: item.run_id,
    }));
}

export function getLatestObservationsForModels(
  modelIds: string[],
  perModelLimit = 10,
): Map<string, ModelObservation[]> {
  return new Map(modelIds.map((id) => [id, getObservationsForModel(id, perModelLimit)]));
}

export function getModelStatus(model: CanonicalModel, nowMs = Date.now()) {
  return deriveModelStatus(
    getObservationsForModel(model.id, 10),
    model.eligibility.probe_eligible,
    model.access_classification === 'downloadable',
    DEFAULT_STATUS_CONFIG,
    nowMs,
  );
}

export function getObservabilityFreshness(nowMs = Date.now()) {
  const lastSuccessfulCycleAt = document.last_successful_cycle_at;
  if (!lastSuccessfulCycleAt) {
    return { available: false, fresh: false, lastSuccessfulCycleAt: null, ageMs: null };
  }
  const ageMs = Math.max(0, nowMs - Date.parse(lastSuccessfulCycleAt));
  return {
    available: lastSuccessfulCycleAt !== null,
    fresh: ageMs <= 3 * 60 * 60 * 1000,
    lastSuccessfulCycleAt,
    ageMs,
  };
}

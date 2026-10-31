import { z } from 'zod';

export const ObservationSchema = z.object({
  model_id: z.string().min(3),
  status: z.enum(['operational', 'degraded', 'unavailable', 'unknown']),
  result_category: z.enum(['success', 'rate_limit', 'http_error', 'timeout', 'invalid_response', 'network_error', 'auth_error']),
  latency_ms: z.number().finite().nonnegative(),
  ttft_ms: z.number().finite().nonnegative().nullable(),
  tokens_out: z.number().int().nonnegative().nullable(),
  tokens_per_second: z.number().finite().nonnegative().nullable(),
  failure_category: z.string().max(100).nullable(),
  error_message: z.string().max(300).nullable(),
  http_status: z.number().int().min(100).max(599).nullable(),
  timestamp: z.string().datetime(),
  region: z.string().min(1).max(80),
  run_id: z.string().min(1).max(120),
});

export const MonitoringCycleSchema = z.object({
  run_id: z.string().min(1).max(120),
  timestamp: z.string().datetime(),
  models_attempted: z.number().int().nonnegative(),
  probes_succeeded: z.number().int().nonnegative(),
  probes_failed: z.number().int().nonnegative(),
  probes_skipped: z.number().int().nonnegative(),
  tokens_consumed: z.number().int().nonnegative(),
  cycle_status: z.enum(['completed', 'partial', 'failed']),
  region: z.string().min(1).max(80),
});

export const ObservabilityDocumentSchema = z.object({
  schema_version: z.literal('1.0.0'),
  provider: z.literal('nvidia-build'),
  generated_at: z.string().datetime(),
  last_successful_cycle_at: z.string().datetime().nullable(),
  monitoring_region: z.string().min(1).max(80),
  latest_cycle: MonitoringCycleSchema.nullable(),
  recent_cycles: z.array(MonitoringCycleSchema).max(48),
  observations: z.array(ObservationSchema).max(3000),
});

export const ProbeArtifactSchema = z.object({
  schema_version: z.literal('1.0.0'),
  cycle: MonitoringCycleSchema,
  observations: z.array(ObservationSchema).min(1).max(100),
});

export type RegistryObservation = z.infer<typeof ObservationSchema>;
export type MonitoringCycle = z.infer<typeof MonitoringCycleSchema>;
export type ObservabilityDocument = z.infer<typeof ObservabilityDocumentSchema>;
export type ProbeArtifact = z.infer<typeof ProbeArtifactSchema>;

export function emptyObservabilityDocument(now = new Date()): ObservabilityDocument {
  return {
    schema_version: '1.0.0',
    provider: 'nvidia-build',
    generated_at: now.toISOString(),
    last_successful_cycle_at: null,
    monitoring_region: 'github-actions',
    latest_cycle: null,
    recent_cycles: [],
    observations: [],
  };
}

/**
 * Merge an independently validated probe cycle into bounded public history.
 * Observation identity is (run_id, model_id), making retries idempotent.
 */
export function mergeObservabilityDocument(
  current: ObservabilityDocument,
  incoming: ProbeArtifact,
  now = new Date(),
): ObservabilityDocument {
  const cutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  const observations = new Map<string, RegistryObservation>();

  for (const item of current.observations) {
    const time = Date.parse(item.timestamp);
    if (Number.isFinite(time) && time >= cutoff) {
      observations.set(`${item.run_id}:${item.model_id}`, item);
    }
  }

  for (const item of incoming.observations) {
    const observedAt = Date.parse(item.timestamp);
    if (!Number.isFinite(observedAt) || observedAt > now.getTime() + 5 * 60 * 1000) {
      throw new Error(`Observation timestamp is invalid or in the future: ${item.model_id}`);
    }
    observations.set(`${item.run_id}:${item.model_id}`, item);
  }

  const perModelCounts = new Map<string, number>();
  const bounded = [...observations.values()].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  ).filter((item) => {
    const count = perModelCounts.get(item.model_id) ?? 0;
    if (count >= 30) return false;
    perModelCounts.set(item.model_id, count + 1);
    return true;
  }).slice(0, 3000);

  const recentCycles = [
    incoming.cycle,
    ...current.recent_cycles.filter((cycle) => cycle.run_id !== incoming.cycle.run_id),
  ].slice(0, 48);

  return ObservabilityDocumentSchema.parse({
    schema_version: '1.0.0',
    provider: 'nvidia-build',
    generated_at: now.toISOString(),
    last_successful_cycle_at: incoming.cycle.timestamp,
    monitoring_region: incoming.cycle.region,
    latest_cycle: incoming.cycle,
    recent_cycles: recentCycles,
    observations: bounded,
  });
}

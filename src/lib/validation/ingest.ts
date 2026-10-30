import { z } from 'zod';

export const IngestionObservationSchema = z.object({
  model_id: z.string().min(3),
  status: z.enum(['operational', 'degraded', 'unavailable', 'unknown', 'stale', 'catalog_only', 'downloadable_only']),
  result_category: z.enum(['success', 'rate_limit', 'http_error', 'timeout', 'invalid_response', 'network_error', 'auth_error']),
  latency_ms: z.number().nonnegative(),
  ttft_ms: z.number().nonnegative().nullable().optional(),
  tokens_out: z.number().int().nonnegative().nullable().optional(),
  tokens_per_sec: z.number().nonnegative().nullable().optional(),
  failure_category: z.string().nullable().optional(),
  error_message: z.string().max(500).nullable().optional(),
  http_status: z.number().int().nullable().optional(),
  timestamp: z.string(),
  region: z.string().default('default'),
});

export const IngestionPayloadSchema = z.object({
  run_id: z.string().regex(/^[a-zA-Z0-9_\-\.]+$/),
  timestamp: z.string(),
  client_identity: z.string().max(100),
  cycle_summary: z.object({
    models_attempted: z.number().int().nonnegative(),
    probes_succeeded: z.number().int().nonnegative(),
    probes_failed: z.number().int().nonnegative(),
    probes_skipped: z.number().int().nonnegative(),
    budget_tokens_consumed: z.number().int().nonnegative().default(0),
    cycle_status: z.enum(['completed', 'partial', 'failed']).default('completed'),
    region: z.string().default('default'),
  }),
  observations: z.array(IngestionObservationSchema).max(500),
});

export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;
export type IngestionObservation = z.infer<typeof IngestionObservationSchema>;

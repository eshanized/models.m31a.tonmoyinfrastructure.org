import { describe, it, expect } from 'vitest';
import { IngestionPayloadSchema } from '../src/lib/validation/ingest';

describe('Protected Ingestion Validation & Schema', () => {
  it('validates a conformant synthetic monitoring batch payload', () => {
    const payload = {
      run_id: 'probe_20261030_120000_abc123',
      timestamp: new Date().toISOString(),
      client_identity: 'github_actions_worker_v1',
      cycle_summary: {
        models_attempted: 2,
        probes_succeeded: 2,
        probes_failed: 0,
        probes_skipped: 0,
        budget_tokens_consumed: 8,
        cycle_status: 'completed' as const,
        region: 'us-east',
      },
      observations: [
        {
          model_id: 'nvidia/nemotron-4-340b-instruct',
          status: 'operational' as const,
          result_category: 'success' as const,
          latency_ms: 1250,
          ttft_ms: 1250,
          tokens_out: 4,
          tokens_per_sec: 18.5,
          failure_category: null,
          error_message: null,
          http_status: 200,
          timestamp: new Date().toISOString(),
          region: 'us-east',
        },
      ],
    };

    const res = IngestionPayloadSchema.safeParse(payload);
    expect(res.success).toBe(true);
  });

  it('rejects invalid run_id containing dangerous characters (path traversal / injection protection)', () => {
    const payload = {
      run_id: '../../evil/path',
      timestamp: new Date().toISOString(),
      client_identity: 'worker',
      cycle_summary: {
        models_attempted: 1,
        probes_succeeded: 1,
        probes_failed: 0,
        probes_skipped: 0,
        budget_tokens_consumed: 0,
        cycle_status: 'completed' as const,
        region: 'default',
      },
      observations: [],
    };

    const res = IngestionPayloadSchema.safeParse(payload);
    expect(res.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  emptyObservabilityDocument,
  mergeObservabilityDocument,
  ProbeArtifactSchema,
} from '../src/lib/observability-contract';

function sampleArtifact(runId: string, timestamp: string) {
  return ProbeArtifactSchema.parse({
    schema_version: '1.0.0',
    cycle: {
      run_id: runId,
      timestamp,
      models_attempted: 1,
      probes_succeeded: 1,
      probes_failed: 0,
      probes_skipped: 0,
      tokens_consumed: 3,
      cycle_status: 'completed',
      region: 'github-hosted-runner',
    },
    observations: [{
      model_id: 'nvidia/test-model',
      status: 'operational',
      result_category: 'success',
      latency_ms: 450,
      ttft_ms: null,
      tokens_out: 3,
      tokens_per_second: 6.67,
      failure_category: null,
      error_message: null,
      http_status: 200,
      timestamp,
      region: 'github-hosted-runner',
      run_id: runId,
    }],
  });
}

describe('static observability publication contract', () => {
  it('creates an empty honest snapshot without fabricated status data', () => {
    const now = new Date('2026-10-31T00:00:00.000Z');
    const empty = emptyObservabilityDocument(now);
    expect(empty.observations).toEqual([]);
    expect(empty.last_successful_cycle_at).toBeNull();
    expect(empty.latest_cycle).toBeNull();
  });

  it('merges a cycle and preserves existing historical observations', () => {
    const now = new Date('2026-10-31T01:00:00.000Z');
    const first = sampleArtifact('run-1', '2026-10-31T00:30:00.000Z');
    const second = sampleArtifact('run-2', '2026-10-31T01:00:00.000Z');
    const afterFirst = mergeObservabilityDocument(emptyObservabilityDocument(now), first, now);
    const merged = mergeObservabilityDocument(afterFirst, second, now);

    expect(merged.observations).toHaveLength(2);
    expect(merged.last_successful_cycle_at).toBe(second.cycle.timestamp);
    expect(merged.recent_cycles.map((cycle) => cycle.run_id)).toEqual(['run-2', 'run-1']);
  });

  it('is idempotent when the same cycle is published more than once', () => {
    const now = new Date('2026-10-31T01:00:00.000Z');
    const artifact = sampleArtifact('run-1', now.toISOString());
    const first = mergeObservabilityDocument(emptyObservabilityDocument(now), artifact, now);
    const repeated = mergeObservabilityDocument(first, artifact, now);
    expect(repeated.observations).toHaveLength(1);
    expect(repeated.recent_cycles).toHaveLength(1);
  });

  it('drops observations outside the retention window', () => {
    const now = new Date('2026-10-31T00:00:00.000Z');
    const old = sampleArtifact('old-run', '2026-10-01T00:00:00.000Z');
    const fresh = sampleArtifact('fresh-run', now.toISOString());
    const previous = mergeObservabilityDocument(emptyObservabilityDocument(now), old, now);
    const merged = mergeObservabilityDocument(previous, fresh, now);
    expect(merged.observations.map((item) => item.run_id)).toEqual(['fresh-run']);
  });

  it('rejects an observation timestamp materially in the future', () => {
    const now = new Date('2026-10-31T00:00:00.000Z');
    const artifact = sampleArtifact('future-run', '2026-10-31T01:00:00.000Z');
    expect(() => mergeObservabilityDocument(emptyObservabilityDocument(now), artifact, now))
      .toThrow(/future/i);
  });

  it('does not treat missing TTFT as total request latency', () => {
    const artifact = sampleArtifact('run-1', '2026-10-31T00:00:00.000Z');
    expect(artifact.observations[0].ttft_ms).toBeNull();
    expect(artifact.observations[0].latency_ms).toBe(450);
  });
});

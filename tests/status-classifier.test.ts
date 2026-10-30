import { describe, it, expect } from 'vitest';
import { deriveModelStatus, DEFAULT_STATUS_CONFIG } from '../src/lib/status/classifier';
import { ModelObservation } from '../src/lib/db/schema';

describe('Status Observability Classifier', () => {
  const baseTime = 1761800000000; // Fixed test baseline epoch

  const createObservation = (
    resultCategory: ModelObservation['resultCategory'],
    latencyMs: number,
    offsetSeconds: number
  ): ModelObservation => ({
    id: 1,
    modelId: 'nvidia/nemotron-4-340b-instruct',
    status: 'operational',
    resultCategory,
    timestamp: new Date(baseTime - offsetSeconds * 1000).toISOString(),
    probeType: 'synthetic_canary',
    region: 'default',
    latencyMs,
    ttftMs: latencyMs,
    tokensOut: 4,
    tokensPerSec: 20.0,
    failureCategory: null,
    errorMessage: null,
    httpStatus: resultCategory === 'success' ? 200 : 500,
    provenance: 'm31a_synthetic_worker',
    runId: 'test_run',
  });

  it('marks model operational when recent probes succeed with healthy latency', () => {
    const obs = [
      createObservation('success', 1200, 60),
      createObservation('success', 1400, 120),
      createObservation('success', 1100, 180),
    ];

    const result = deriveModelStatus(obs, true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('operational');
    expect(result.isStale).toBe(false);
    expect(result.averageLatencyMs).toBeCloseTo(1233.33, 1);
  });

  it('marks model degraded when average latency exceeds threshold', () => {
    const obs = [
      createObservation('success', 5200, 60),
      createObservation('success', 4800, 120),
      createObservation('success', 4500, 180),
    ];

    const result = deriveModelStatus(obs, true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('degraded');
    expect(result.reason).toContain('exceeds threshold');
  });

  it('does NOT mark model unavailable due to 401/403 auth errors', () => {
    const obs = [
      createObservation('auth_error', 150, 60),
      createObservation('auth_error', 140, 120),
      createObservation('auth_error', 160, 180),
    ];

    const result = deriveModelStatus(obs, true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('unknown');
    expect(result.reason).toContain('authentication');
  });

  it('does NOT mark model unavailable due to rate limits alone', () => {
    const obs = [
      createObservation('rate_limit', 300, 60),
      createObservation('success', 1200, 120),
    ];

    const result = deriveModelStatus(obs, true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('degraded');
  });

  it('marks model unavailable only on repeated consecutive endpoint failures', () => {
    const obs = [
      createObservation('http_error', 500, 60),
      createObservation('timeout', 10000, 120),
      createObservation('network_error', 200, 180),
    ];

    const result = deriveModelStatus(obs, true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('3 consecutive endpoint probes failed');
  });

  it('classifies stale data when latest observation exceeds threshold', () => {
    const oldObservation = createObservation('success', 1000, 25 * 3600); // 25 hours old
    const result = deriveModelStatus([oldObservation], true, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('stale');
    expect(result.isStale).toBe(true);
  });

  it('classifies catalog_only when probe eligibility is false', () => {
    const result = deriveModelStatus([], false, false, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('catalog_only');
  });

  it('classifies downloadable_only when model is a local weights artifact', () => {
    const result = deriveModelStatus([], false, true, DEFAULT_STATUS_CONFIG, baseTime);
    expect(result.status).toBe('downloadable_only');
  });
});

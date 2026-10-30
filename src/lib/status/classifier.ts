import { ObservedHealthStatus } from '../types/registry';
import { ModelObservation } from '../db/schema';

export interface StatusClassificationConfig {
  staleThresholdMs: number; // default: 24h (86_400_000 ms)
  degradedLatencyThresholdMs: number; // default: 4_000 ms
  consecutiveFailuresForUnavailable: number; // default: 3
  degradedFailureRateThreshold: number; // default: 0.25 (25%)
}

export const DEFAULT_STATUS_CONFIG: StatusClassificationConfig = {
  staleThresholdMs: 24 * 60 * 60 * 1000,
  degradedLatencyThresholdMs: 4000,
  consecutiveFailuresForUnavailable: 3,
  degradedFailureRateThreshold: 0.25,
};

export interface ClassifiedStatusResult {
  status: ObservedHealthStatus;
  reason: string;
  isStale: boolean;
  sampleCount: number;
  averageLatencyMs: number | null;
  successRate: number | null;
  lastObservedAt: string | null;
}

/**
 * Derives honest public status from a sequence of recent observations.
 * Enforces strict non-conflation: auth errors (401/403) and rate limits (429)
 * never mark a model "unavailable" on their own.
 */
export function deriveModelStatus(
  observations: ModelObservation[],
  isProbeEligible: boolean,
  isDownloadableOnly: boolean = false,
  config: StatusClassificationConfig = DEFAULT_STATUS_CONFIG,
  nowMs: number = Date.now()
): ClassifiedStatusResult {
  if (isDownloadableOnly) {
    return {
      status: 'downloadable_only',
      reason: 'Model is distributed as a downloadable container/weights artifact, not a public hosted endpoint.',
      isStale: false,
      sampleCount: 0,
      averageLatencyMs: null,
      successRate: null,
      lastObservedAt: null,
    };
  }

  if (!isProbeEligible) {
    return {
      status: 'catalog_only',
      reason: 'Model is cataloged in the registry, but no eligible synthetic probe endpoint is configured.',
      isStale: false,
      sampleCount: 0,
      averageLatencyMs: null,
      successRate: null,
      lastObservedAt: null,
    };
  }

  if (!observations || observations.length === 0) {
    return {
      status: 'unknown',
      reason: 'Insufficient probe observations recorded for this model.',
      isStale: false,
      sampleCount: 0,
      averageLatencyMs: null,
      successRate: null,
      lastObservedAt: null,
    };
  }

  // Sort descending by timestamp
  const sorted = [...observations].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const latest = sorted[0];
  const latestTime = new Date(latest.timestamp).getTime();
  const ageMs = nowMs - latestTime;
  const isStale = ageMs > config.staleThresholdMs;

  if (isStale) {
    return {
      status: 'stale',
      reason: `Historical observations exist, but latest probe is older than ${Math.round(config.staleThresholdMs / 3600000)}h.`,
      isStale: true,
      sampleCount: sorted.length,
      averageLatencyMs: latest.latencyMs,
      successRate: null,
      lastObservedAt: latest.timestamp,
    };
  }

  // Analyze recent window (up to 10 observations)
  const window = sorted.slice(0, 10);
  const eligibleProbes = window.filter((o) => o.resultCategory !== 'auth_error');

  if (eligibleProbes.length === 0) {
    return {
      status: 'unknown',
      reason: 'All recent probes encountered authentication or configuration anomalies; insufficient valid observations.',
      isStale: false,
      sampleCount: sorted.length,
      averageLatencyMs: null,
      successRate: null,
      lastObservedAt: latest.timestamp,
    };
  }

  let consecutiveFailures = 0;
  for (const probe of eligibleProbes) {
    if (probe.resultCategory === 'success') {
      break;
    }
    if (
      probe.resultCategory === 'http_error' ||
      probe.resultCategory === 'timeout' ||
      probe.resultCategory === 'network_error' ||
      probe.resultCategory === 'invalid_response'
    ) {
      consecutiveFailures++;
    }
  }

  const successes = eligibleProbes.filter((p) => p.resultCategory === 'success');
  const successRate = eligibleProbes.length > 0 ? successes.length / eligibleProbes.length : 0;
  const avgLatency =
    successes.length > 0
      ? successes.reduce((acc, curr) => acc + curr.latencyMs, 0) / successes.length
      : null;

  if (consecutiveFailures >= config.consecutiveFailuresForUnavailable) {
    return {
      status: 'unavailable',
      reason: `${consecutiveFailures} consecutive endpoint probes failed with classified endpoint errors.`,
      isStale: false,
      sampleCount: eligibleProbes.length,
      averageLatencyMs: avgLatency,
      successRate,
      lastObservedAt: latest.timestamp,
    };
  }

  const failureRate = 1 - successRate;
  if (failureRate >= config.degradedFailureRateThreshold) {
    return {
      status: 'degraded',
      reason: `Elevated failure rate (${Math.round(failureRate * 100)}%) observed across recent monitoring samples.`,
      isStale: false,
      sampleCount: eligibleProbes.length,
      averageLatencyMs: avgLatency,
      successRate,
      lastObservedAt: latest.timestamp,
    };
  }

  if (avgLatency !== null && avgLatency > config.degradedLatencyThresholdMs) {
    return {
      status: 'degraded',
      reason: `Observed average response latency (${Math.round(avgLatency)}ms) exceeds threshold (${config.degradedLatencyThresholdMs}ms).`,
      isStale: false,
      sampleCount: eligibleProbes.length,
      averageLatencyMs: avgLatency,
      successRate,
      lastObservedAt: latest.timestamp,
    };
  }

  return {
    status: 'operational',
    reason: `Recent synthetic probes succeeded with normal latency (${Math.round(avgLatency || latest.latencyMs)}ms).`,
    isStale: false,
    sampleCount: eligibleProbes.length,
    averageLatencyMs: avgLatency || latest.latencyMs,
    successRate,
    lastObservedAt: latest.timestamp,
  };
}

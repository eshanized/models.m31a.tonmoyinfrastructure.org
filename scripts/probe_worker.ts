import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getAllModels } from '../src/lib/catalog';
import type { CanonicalModel } from '../src/lib/types/registry';
import type { ProbeArtifact, RegistryObservation } from '../src/lib/observability-contract';

interface ProbeConfig {
  apiKey: string;
  baseUrl: string;
  perCycleLimit: number;
  concurrencyLimit: number;
  timeoutMs: number;
  maxRetries: number;
  killSwitch: boolean;
}

interface ProbeResult extends RegistryObservation {}

function positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return fallback;
  return parsed;
}

function loadConfig(): ProbeConfig {
  return {
    apiKey: process.env.NVIDIA_API_KEY?.trim() ?? '',
    baseUrl: (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, ''),
    perCycleLimit: positiveInteger(process.env.PROBE_PER_CYCLE_LIMIT, 8, 40),
    concurrencyLimit: positiveInteger(process.env.PROBE_CONCURRENCY, 2, 5),
    timeoutMs: positiveInteger(process.env.PROBE_TIMEOUT_MS, 15000, 60000),
    maxRetries: Number.isInteger(Number(process.env.PROBE_MAX_RETRIES))
      ? Math.min(3, Math.max(0, Number(process.env.PROBE_MAX_RETRIES)))
      : 2,
    killSwitch: process.env.PROBE_KILL_SWITCH === 'true',
  };
}

function observation(
  model: CanonicalModel,
  runId: string,
  startedAt: string,
  status: ProbeResult['status'],
  resultCategory: ProbeResult['result_category'],
  latencyMs: number,
  httpStatus: number | null,
  failureCategory: string | null,
  errorMessage: string | null,
  usage?: { completion_tokens?: unknown },
): ProbeResult {
  const rawTokens = usage?.completion_tokens;
  const tokensOut = typeof rawTokens === 'number' && Number.isInteger(rawTokens) && rawTokens >= 0
    ? rawTokens
    : null;
  return {
    model_id: model.id,
    status,
    result_category: resultCategory,
    latency_ms: Math.max(0, Math.round(latencyMs)),
    // This worker uses non-streaming canaries. Total duration is not TTFT.
    ttft_ms: null,
    tokens_out: tokensOut,
    tokens_per_second: tokensOut !== null && latencyMs > 0
      ? Number((tokensOut / (latencyMs / 1000)).toFixed(2))
      : null,
    failure_category: failureCategory,
    error_message: errorMessage,
    http_status: httpStatus,
    timestamp: startedAt,
    region: 'github-hosted-runner',
    run_id: runId,
  };
}

async function probeModel(
  model: CanonicalModel,
  config: ProbeConfig,
  runId: string,
): Promise<ProbeResult> {
  const endpoint = `${config.baseUrl}/chat/completions`;
  const payload = {
    model: model.id,
    messages: [{ role: 'user', content: 'Reply with PONG.' }],
    max_tokens: Math.min(4, model.eligibility.max_probe_tokens ?? 4),
    temperature: 0,
    stream: false,
  };

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const timestamp = new Date().toISOString();
    const started = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'User-Agent': 'M31A-NVIDIA-Build-Monitor/1.1',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        return observation(model, runId, timestamp, 'unknown', 'auth_error',
          performance.now() - started, response.status, 'authentication_failure',
          'NVIDIA rejected the monitoring credential or its access permissions.');
      }

      if (response.status === 429) {
        return observation(model, runId, timestamp, 'degraded', 'rate_limit',
          performance.now() - started, 429, 'rate_limited',
          'NVIDIA Build returned HTTP 429 for the synthetic canary.');
      }

      if (response.status >= 500 && attempt < config.maxRetries) {
        await response.body?.cancel();
        const delay = Math.min(8000, 500 * (2 ** attempt)) + Math.floor(Math.random() * 250);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        return observation(model, runId, timestamp, 'unknown', 'invalid_response',
          performance.now() - started, response.status, 'request_rejected',
          `NVIDIA Build rejected the canary with HTTP ${response.status}.`);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return observation(model, runId, timestamp, 'unknown', 'invalid_response',
          performance.now() - started, response.status, 'invalid_json',
          'NVIDIA Build returned a successful HTTP status with an invalid JSON body.');
      }

      const record = body && typeof body === 'object' ? body as Record<string, unknown> : null;
      const choices = record?.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        return observation(model, runId, timestamp, 'unknown', 'invalid_response',
          performance.now() - started, response.status, 'missing_completion',
          'NVIDIA Build response did not contain a completion choice.');
      }

      const latencyMs = performance.now() - started;
      const usage = record?.usage && typeof record.usage === 'object'
        ? record.usage as { completion_tokens?: unknown }
        : undefined;
      return observation(
        model, runId, timestamp, latencyMs > 4000 ? 'degraded' : 'operational',
        'success', latencyMs, response.status, null, null, usage,
      );
    } catch (error) {
      const latencyMs = performance.now() - started;
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (attempt < config.maxRetries) {
        const delay = Math.min(8000, 500 * (2 ** attempt)) + Math.floor(Math.random() * 250);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return observation(
        model,
        runId,
        timestamp,
        'unavailable',
        aborted ? 'timeout' : 'network_error',
        latencyMs,
        null,
        aborted ? 'request_timeout' : 'connection_failure',
        aborted
          ? `Synthetic request exceeded the ${config.timeoutMs}ms timeout.`
          : 'Synthetic request could not establish a successful network response.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return observation(model, runId, new Date().toISOString(), 'unknown',
    'invalid_response', 0, null, 'retry_exhausted', 'Probe retries were exhausted.');
}

async function runBounded<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function writeArtifact(artifact: ProbeArtifact): void {
  const outputPath = path.resolve(process.cwd(), '.cache/observability-run.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporaryPath, outputPath);
}

export async function runMonitoringCycle(): Promise<void> {
  console.log('Starting scheduled NVIDIA Build synthetic monitoring cycle...');
  const config = loadConfig();

  if (config.killSwitch) {
    console.log('PROBE_KILL_SWITCH is active. No requests or publication artifact will be produced.');
    return;
  }
  if (config.apiKey.length < 8) {
    throw new Error('NVIDIA_API_KEY is missing or too short; refusing to report a successful monitoring cycle.');
  }

  const eligibleModels = getAllModels()
    .filter((model) => model.eligibility.probe_eligible && model.protocol === 'openai-chat')
    .sort((a, b) => a.id.localeCompare(b.id));

  if (eligibleModels.length === 0) {
    throw new Error('The catalog contains no probe-eligible OpenAI-compatible models.');
  }

  const count = Math.min(config.perCycleLimit, eligibleModels.length);
  const rotation = Math.floor(Date.now() / (30 * 60 * 1000));
  const startIndex = (rotation * count) % eligibleModels.length;
  const selected = Array.from({ length: count }, (_, offset) =>
    eligibleModels[(startIndex + offset) % eligibleModels.length]);

  const runId = `probe_${process.env.GITHUB_RUN_ID || Date.now()}_${process.env.GITHUB_RUN_ATTEMPT || crypto.randomBytes(3).toString('hex')}`;
  console.log(`Probing ${selected.length} of ${eligibleModels.length} eligible models with concurrency ${config.concurrencyLimit}.`);

  const observations = await runBounded(
    selected,
    config.concurrencyLimit,
    async (model) => {
      console.log(`Probing ${model.id}...`);
      const result = await probeModel(model, config, runId);
      console.log(`  ${result.result_category.toUpperCase()} — ${result.latency_ms}ms (HTTP ${result.http_status ?? 'n/a'})`);
      return result;
    },
  );

  const succeeded = observations.filter((item) => item.result_category === 'success').length;
  const failed = observations.length - succeeded;
  const timestamp = new Date().toISOString();
  const artifact: ProbeArtifact = {
    schema_version: '1.0.0',
    cycle: {
      run_id: runId,
      timestamp,
      models_attempted: observations.length,
      probes_succeeded: succeeded,
      probes_failed: failed,
      probes_skipped: eligibleModels.length - observations.length,
      tokens_consumed: observations.reduce((total, item) => total + (item.tokens_out ?? 0), 0),
      cycle_status: failed === 0 ? 'completed' : succeeded === 0 ? 'failed' : 'partial',
      region: 'github-hosted-runner',
    },
    observations,
  };

  writeArtifact(artifact);
  console.log(`Probe cycle complete: ${succeeded} succeeded, ${failed} failed. Artifact is ready for validated publication.`);
}

if (require.main === module || process.argv[1]?.endsWith('probe_worker')) {
  runMonitoringCycle().catch((error) => {
    console.error('Probe worker failed:', (error as Error).message);
    process.exit(1);
  });
}

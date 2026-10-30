import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getAllModels } from '../src/lib/catalog';
import { CanonicalModel } from '../src/lib/types/registry';
import { deriveModelStatus } from '../src/lib/status/classifier';
import { IngestionPayload } from '../src/lib/validation/ingest';

interface ProbeConfig {
  apiKey: string;
  baseUrl: string;
  ingestionUrl?: string;
  ingestionSecret?: string;
  perCycleLimit: number;
  concurrencyLimit: number;
  timeoutMs: number;
  maxRetries: number;
  killSwitch: boolean;
}

function loadConfig(): ProbeConfig {
  return {
    apiKey: process.env.NVIDIA_API_KEY || '',
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    ingestionUrl: process.env.INGESTION_URL,
    ingestionSecret: process.env.INGESTION_SECRET,
    perCycleLimit: parseInt(process.env.PROBE_PER_CYCLE_LIMIT || '5', 10),
    concurrencyLimit: parseInt(process.env.PROBE_CONCURRENCY || '2', 10),
    timeoutMs: parseInt(process.env.PROBE_TIMEOUT_MS || '10000', 10),
    maxRetries: parseInt(process.env.PROBE_MAX_RETRIES || '2', 10),
    killSwitch: process.env.PROBE_KILL_SWITCH === 'true',
  };
}

interface ProbeResult {
  modelId: string;
  status: 'operational' | 'degraded' | 'unavailable' | 'unknown';
  resultCategory: 'success' | 'rate_limit' | 'http_error' | 'timeout' | 'invalid_response' | 'network_error' | 'auth_error';
  latencyMs: number;
  ttftMs: number | null;
  tokensOut: number | null;
  tokensPerSec: number | null;
  failureCategory: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
  timestamp: string;
}

async function probeModelWithRetry(
  model: CanonicalModel,
  config: ProbeConfig
): Promise<ProbeResult> {
  const endpoint = `${config.baseUrl}/chat/completions`;
  const canaryPayload = {
    model: model.id,
    messages: [{ role: 'user', content: 'Ping' }],
    max_tokens: 4,
    temperature: 0.1,
  };

  let attempt = 0;
  while (attempt <= config.maxRetries) {
    attempt++;
    const start = performance.now();
    const timestamp = new Date().toISOString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'User-Agent': 'M31A-Model-Monitor/1.0',
        },
        body: JSON.stringify(canaryPayload),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);

      if (resp.status === 200) {
        const body = (await resp.json()) as any;
        const text = body?.choices?.[0]?.message?.content || '';
        const tokensOut = body?.usage?.completion_tokens || 1;
        const tokensPerSec = latencyMs > 0 ? (tokensOut / (latencyMs / 1000)) : 0;

        return {
          modelId: model.id,
          status: latencyMs > 4000 ? 'degraded' : 'operational',
          resultCategory: 'success',
          latencyMs,
          ttftMs: latencyMs,
          tokensOut,
          tokensPerSec: parseFloat(tokensPerSec.toFixed(2)),
          failureCategory: null,
          errorMessage: null,
          httpStatus: 200,
          timestamp,
        };
      }

      if (resp.status === 401 || resp.status === 403) {
        return {
          modelId: model.id,
          status: 'unknown',
          resultCategory: 'auth_error',
          latencyMs,
          ttftMs: null,
          tokensOut: null,
          tokensPerSec: null,
          failureCategory: 'authentication_failure',
          errorMessage: 'Server credential rejected or unauthorized',
          httpStatus: resp.status,
          timestamp,
        };
      }

      if (resp.status === 429) {
        return {
          modelId: model.id,
          status: 'degraded',
          resultCategory: 'rate_limit',
          latencyMs,
          ttftMs: null,
          tokensOut: null,
          tokensPerSec: null,
          failureCategory: 'rate_limited',
          errorMessage: 'Endpoint returned 429 Too Many Requests',
          httpStatus: 429,
          timestamp,
        };
      }

      // 5xx or other status
      if (attempt <= config.maxRetries) {
        // Exponential backoff with jitter
        const backoff = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return {
        modelId: model.id,
        status: 'unavailable',
        resultCategory: 'http_error',
        latencyMs,
        ttftMs: null,
        tokensOut: null,
        tokensPerSec: null,
        failureCategory: `upstream_http_${resp.status}`,
        errorMessage: `Upstream HTTP ${resp.status}`,
        httpStatus: resp.status,
        timestamp,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);

      if (err.name === 'AbortError') {
        if (attempt <= config.maxRetries) {
          continue;
        }
        return {
          modelId: model.id,
          status: 'unavailable',
          resultCategory: 'timeout',
          latencyMs,
          ttftMs: null,
          tokensOut: null,
          tokensPerSec: null,
          failureCategory: 'request_timeout',
          errorMessage: `Request timed out after ${config.timeoutMs}ms`,
          httpStatus: null,
          timestamp,
        };
      }

      if (attempt <= config.maxRetries) {
        continue;
      }

      return {
        modelId: model.id,
        status: 'unavailable',
        resultCategory: 'network_error',
        latencyMs,
        ttftMs: null,
        tokensOut: null,
        tokensPerSec: null,
        failureCategory: 'connection_failure',
        errorMessage: 'Network connection error',
        httpStatus: null,
        timestamp,
      };
    }
  }

  // Fallback
  return {
    modelId: model.id,
    status: 'unknown',
    resultCategory: 'invalid_response',
    latencyMs: 0,
    ttftMs: null,
    tokensOut: null,
    tokensPerSec: null,
    failureCategory: 'exhausted_retries',
    errorMessage: 'Exhausted retries',
    httpStatus: null,
    timestamp: new Date().toISOString(),
  };
}

export async function runMonitoringCycle() {
  console.log('🩺 Launching scheduled synthetic endpoint monitoring cycle...');
  const config = loadConfig();

  if (config.killSwitch) {
    console.log('🛑 Kill switch is active (PROBE_KILL_SWITCH=true). Aborting cycle cleanly.');
    return;
  }

  if (!config.apiKey || config.apiKey.length < 5) {
    console.log('ℹ️ NVIDIA_API_KEY is not configured or empty. Skipping live network probing.');
    console.log('ℹ️ Operating in honest catalog-only mode.');
    return;
  }

  const allModels = getAllModels();
  const eligibleModels = allModels.filter((m) => m.eligibility.probe_eligible);

  if (eligibleModels.length === 0) {
    console.log('No probe-eligible models found in catalog.');
    return;
  }

  // Select rotating subset based on minute of day
  const currentMinute = Math.floor(Date.now() / (1000 * 60));
  const startIndex = (currentMinute * config.perCycleLimit) % eligibleModels.length;
  const cycleBatch: CanonicalModel[] = [];

  for (let i = 0; i < config.perCycleLimit; i++) {
    cycleBatch.push(eligibleModels[(startIndex + i) % eligibleModels.length]);
  }

  console.log(`🎯 Probing rotating subset of ${cycleBatch.length} models (limit: ${config.perCycleLimit})...`);

  const runId = `probe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const observations: ProbeResult[] = [];

  for (const model of cycleBatch) {
    console.log(`  → Probing ${model.id}...`);
    const res = await probeModelWithRetry(model, config);
    observations.push(res);
    console.log(`    ↳ ${res.status.toUpperCase()} (${res.resultCategory}, ${res.latencyMs}ms)`);
  }

  const succeeded = observations.filter((o) => o.resultCategory === 'success').length;
  const failed = observations.length - succeeded;

  const payload: IngestionPayload = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    client_identity: 'github_actions_scheduled_worker_v1',
    cycle_summary: {
      models_attempted: cycleBatch.length,
      probes_succeeded: succeeded,
      probes_failed: failed,
      probes_skipped: 0,
      budget_tokens_consumed: observations.reduce((acc, o) => acc + (o.tokensOut || 0), 0),
      cycle_status: 'completed',
      region: 'us-east',
    },
    observations: observations.map((o) => ({
      model_id: o.modelId,
      status: o.status,
      result_category: o.resultCategory,
      latency_ms: o.latencyMs,
      ttft_ms: o.ttftMs,
      tokens_out: o.tokensOut,
      tokens_per_sec: o.tokensPerSec,
      failure_category: o.failureCategory,
      error_message: o.errorMessage,
      http_status: o.httpStatus,
      timestamp: o.timestamp,
      region: 'us-east',
    })),
  };

  // Deliver to ingestion endpoint if configured
  if (config.ingestionUrl && config.ingestionSecret) {
    console.log(`📡 Submitting observations to ingestion endpoint: ${config.ingestionUrl}...`);
    try {
      const resp = await fetch(config.ingestionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ingestionSecret}`,
        },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const body = await resp.json();
        console.log(`✅ Ingestion acknowledged:`, body);
      } else {
        console.error(`❌ Ingestion failed with HTTP ${resp.status}:`, await resp.text());
      }
    } catch (err) {
      console.error(`❌ Failed to deliver to ingestion endpoint:`, (err as Error).message);
    }
  } else {
    console.log(`ℹ️ INGESTION_URL or INGESTION_SECRET not configured. Cycle completed in local dry-run mode.`);
  }
}

if (require.main === module || process.argv[1]?.includes('probe_worker')) {
  runMonitoringCycle().catch((err) => {
    console.error('Probe worker crashed:', err);
    process.exit(1);
  });
}

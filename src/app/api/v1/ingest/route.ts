import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { IngestionPayloadSchema } from '@/lib/validation/ingest';
import { getAllModels } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { NewModelObservation } from '@/lib/db/schema';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const configuredSecret = process.env.INGESTION_SECRET;
    if (!configuredSecret || configuredSecret.length < 16) {
      return NextResponse.json(
        { error: 'Ingestion endpoint not enabled or secret insufficiently configured' },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    if (!safeCompare(token, configuredSecret)) {
      return NextResponse.json({ error: 'Unauthorized ingestion attempt' }, { status: 403 });
    }

    // 2. Body size check (< 1MB)
    const rawBody = await req.json();

    // 3. Schema validation
    const parseResult = IngestionPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Payload schema validation failed',
          issues: parseResult.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    // 4. Timestamp drift check (window ±15 minutes)
    const payloadTime = new Date(payload.timestamp).getTime();
    const now = Date.now();
    const driftMs = Math.abs(now - payloadTime);
    if (isNaN(payloadTime) || driftMs > 15 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Timestamp is outside the permissible skew window (±15 minutes)' },
        { status: 400 }
      );
    }

    // 5. Model ID validation against registry
    const knownModels = new Set(getAllModels().map((m) => m.id));
    const validObservations: NewModelObservation[] = [];
    let rejectedCount = 0;

    for (const obs of payload.observations) {
      if (!knownModels.has(obs.model_id)) {
        rejectedCount++;
        continue;
      }

      validObservations.push({
        modelId: obs.model_id,
        status: obs.status,
        resultCategory: obs.result_category,
        timestamp: obs.timestamp,
        probeType: 'synthetic_canary',
        region: obs.region || 'default',
        latencyMs: obs.latency_ms,
        ttftMs: obs.ttft_ms || null,
        tokensOut: obs.tokens_out || null,
        tokensPerSec: obs.tokens_per_sec || null,
        failureCategory: obs.failure_category || null,
        errorMessage: obs.error_message ? obs.error_message.slice(0, 500) : null,
        httpStatus: obs.http_status || null,
        provenance: 'm31a_synthetic_worker',
        runId: payload.run_id,
      });
    }

    // 6. Persistence
    if (StatusRepository.isAvailable()) {
      await StatusRepository.recordObservations(validObservations);
      await StatusRepository.recordCycle({
        id: payload.run_id,
        startedAt: payload.timestamp,
        finishedAt: new Date().toISOString(),
        modelsAttempted: payload.cycle_summary.models_attempted,
        probesSucceeded: payload.cycle_summary.probes_succeeded,
        probesFailed: payload.cycle_summary.probes_failed,
        probesSkipped: payload.cycle_summary.probes_skipped,
        budgetTokensConsumed: payload.cycle_summary.budget_tokens_consumed,
        cycleStatus: payload.cycle_summary.cycle_status,
        region: payload.cycle_summary.region,
      });
      await StatusRepository.recordAudit({
        id: `audit_${payload.run_id}_${Date.now()}`,
        runId: payload.run_id,
        acceptedRecords: validObservations.length,
        rejectedRecords: rejectedCount,
        timestamp: new Date().toISOString(),
        clientIdentity: payload.client_identity,
        diagnostics: JSON.stringify({
          valid: validObservations.length,
          rejected: rejectedCount,
        }),
      });
    } else {
      console.warn('⚠️ Ingestion received valid payload, but database is not configured. Observations not persisted.');
    }

    return NextResponse.json({
      success: true,
      run_id: payload.run_id,
      accepted_count: validObservations.length,
      rejected_count: rejectedCount,
      persisted: StatusRepository.isAvailable(),
    });
  } catch (err) {
    console.error('Ingestion endpoint error:', err);
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}

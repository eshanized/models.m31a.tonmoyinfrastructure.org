import { pgTable, text, timestamp, doublePrecision, integer, index, serial } from 'drizzle-orm/pg-core';

export const modelObservations = pgTable(
  'model_observations',
  {
    id: serial('id').primaryKey(),
    modelId: text('model_id').notNull(),
    status: text('status').notNull(), // 'operational', 'degraded', 'unavailable', 'unknown', 'stale', 'catalog_only'
    resultCategory: text('result_category').notNull(), // 'success', 'rate_limit', 'http_error', 'timeout', 'invalid_response', 'network_error', 'auth_error'
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' }).notNull(),
    probeType: text('probe_type').notNull().default('synthetic_canary'),
    region: text('region').notNull().default('default'),
    latencyMs: doublePrecision('latency_ms').notNull(),
    ttftMs: doublePrecision('ttft_ms'),
    tokensOut: integer('tokens_out'),
    tokensPerSec: doublePrecision('tokens_per_sec'),
    failureCategory: text('failure_category'),
    errorMessage: text('error_message'),
    httpStatus: integer('http_status'),
    provenance: text('provenance').notNull().default('m31a_synthetic_worker'),
    runId: text('run_id'),
  },
  (table) => [
    index('idx_obs_model_time').on(table.modelId, table.timestamp),
    index('idx_obs_timestamp').on(table.timestamp),
    index('idx_obs_run_id').on(table.runId),
  ]
);

export const statusTransitions = pgTable(
  'status_transitions',
  {
    id: serial('id').primaryKey(),
    modelId: text('model_id').notNull(),
    prevStatus: text('prev_status').notNull(),
    newStatus: text('new_status').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' }).notNull(),
    reason: text('reason').notNull(),
    observationId: integer('observation_id'),
  },
  (table) => [
    index('idx_trans_model_time').on(table.modelId, table.timestamp),
  ]
);

export const monitoringCycles = pgTable(
  'monitoring_cycles',
  {
    id: text('id').primaryKey(), // run_id
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
    modelsAttempted: integer('models_attempted').notNull().default(0),
    probesSucceeded: integer('probes_succeeded').notNull().default(0),
    probesFailed: integer('probes_failed').notNull().default(0),
    probesSkipped: integer('probes_skipped').notNull().default(0),
    budgetTokensConsumed: integer('budget_tokens_consumed').notNull().default(0),
    cycleStatus: text('cycle_status').notNull().default('completed'), // 'completed', 'partial', 'failed'
    region: text('region').notNull().default('default'),
  },
  (table) => [
    index('idx_cycle_started').on(table.startedAt),
  ]
);

export const ingestionAudits = pgTable(
  'ingestion_audits',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    acceptedRecords: integer('accepted_records').notNull().default(0),
    rejectedRecords: integer('rejected_records').notNull().default(0),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' }).notNull(),
    clientIdentity: text('client_identity').notNull(),
    diagnostics: text('diagnostics'),
  },
  (table) => [
    index('idx_audit_timestamp').on(table.timestamp),
  ]
);

export type ModelObservation = typeof modelObservations.$inferSelect;
export type NewModelObservation = typeof modelObservations.$inferInsert;
export type StatusTransition = typeof statusTransitions.$inferSelect;
export type NewStatusTransition = typeof statusTransitions.$inferInsert;
export type MonitoringCycle = typeof monitoringCycles.$inferSelect;
export type NewMonitoringCycle = typeof monitoringCycles.$inferInsert;
export type IngestionAudit = typeof ingestionAudits.$inferSelect;
export type NewIngestionAudit = typeof ingestionAudits.$inferInsert;

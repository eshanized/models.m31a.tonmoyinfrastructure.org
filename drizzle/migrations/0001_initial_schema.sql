-- Versioned Migration: 0001_initial_schema.sql
-- NVIDIA Build Model Intelligence Persistence Layer
-- PostgreSQL / Supabase Compatible

CREATE TABLE IF NOT EXISTS "model_observations" (
  "id" SERIAL PRIMARY KEY,
  "model_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "result_category" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "probe_type" TEXT NOT NULL DEFAULT 'synthetic_canary',
  "region" TEXT NOT NULL DEFAULT 'default',
  "latency_ms" DOUBLE PRECISION NOT NULL,
  "ttft_ms" DOUBLE PRECISION,
  "tokens_out" INTEGER,
  "tokens_per_sec" DOUBLE PRECISION,
  "failure_category" TEXT,
  "error_message" TEXT,
  "http_status" INTEGER,
  "provenance" TEXT NOT NULL DEFAULT 'm31a_synthetic_worker',
  "run_id" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_obs_model_time" ON "model_observations" ("model_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_obs_timestamp" ON "model_observations" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_obs_run_id" ON "model_observations" ("run_id");

CREATE TABLE IF NOT EXISTS "status_transitions" (
  "id" SERIAL PRIMARY KEY,
  "model_id" TEXT NOT NULL,
  "prev_status" TEXT NOT NULL,
  "new_status" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "reason" TEXT NOT NULL,
  "observation_id" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_trans_model_time" ON "status_transitions" ("model_id", "timestamp" DESC);

CREATE TABLE IF NOT EXISTS "monitoring_cycles" (
  "id" TEXT PRIMARY KEY,
  "started_at" TIMESTAMPTZ NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "models_attempted" INTEGER NOT NULL DEFAULT 0,
  "probes_succeeded" INTEGER NOT NULL DEFAULT 0,
  "probes_failed" INTEGER NOT NULL DEFAULT 0,
  "probes_skipped" INTEGER NOT NULL DEFAULT 0,
  "budget_tokens_consumed" INTEGER NOT NULL DEFAULT 0,
  "cycle_status" TEXT NOT NULL DEFAULT 'completed',
  "region" TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS "idx_cycle_started" ON "monitoring_cycles" ("started_at" DESC);

CREATE TABLE IF NOT EXISTS "ingestion_audits" (
  "id" TEXT PRIMARY KEY,
  "run_id" TEXT NOT NULL,
  "accepted_records" INTEGER NOT NULL DEFAULT 0,
  "rejected_records" INTEGER NOT NULL DEFAULT 0,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "client_identity" TEXT NOT NULL,
  "diagnostics" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_audit_timestamp" ON "ingestion_audits" ("timestamp" DESC);

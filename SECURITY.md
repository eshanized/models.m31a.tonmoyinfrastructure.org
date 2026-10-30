# Security & Observability Policy

## 1. Threat Model & Mitigations

### Untrusted Catalog & External Ingestion
- Public model metadata and remote API responses are treated as untrusted inputs.
- All incoming payloads must conform to strict runtime Zod schemas (`CanonicalModelSchema`, `IngestionPayloadSchema`).
- Model IDs are validated with strict regex patterns (`^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$`) and checked against the known registry whitelist before database persistence, completely preventing SQL injection, path traversal, and SSRF attacks.

### Ingestion Authentication
- Internal ingestion requests to `/api/v1/ingest` require a high-entropy bearer token (`INGESTION_SECRET`).
- Authentication checks use constant-time comparison via Node.js `crypto.timingSafeEqual` with strict length guards to eliminate timing-attack vulnerabilities.
- Payloads exceeding 1MB or containing timestamps with >15 minutes skew are rejected automatically.

### Secret Isolation & Non-Leakage
- API keys (`NVIDIA_API_KEY`), database passwords (`DATABASE_URL`), and ingestion tokens (`INGESTION_SECRET`) exist strictly server-side.
- Zero secrets are ever included in client-side React props, browser bundles, URLs, HTML responses, error logs, or source maps.
- Synthetic probe logs only record sanitized event classifications; prompt text, authorization headers, and raw keys are never written to disk or database tables.

---

## 2. Status Classification Rules

| Condition | Derived Public Status | Action Taken |
|---|---|---|
| Recent probes succeed with avg latency < 4000ms | `operational` | Endpoint is healthy |
| Avg latency >= 4000ms OR failure rate >= 25% | `degraded` | Flagged as degraded performance |
| >= 3 consecutive 5xx/timeout/network errors | `unavailable` | Marked unavailable |
| Upstream HTTP 401 or 403 response | `unknown` | Credential alert triggered; does NOT mark endpoint unavailable |
| Upstream HTTP 429 response | `degraded` | Rate limit recorded; does NOT mark endpoint unavailable |
| Latest observation > 24 hours old | `stale` | Labeled as stale historical data |
| No eligible endpoint / guardrail only | `catalog_only` | Labeled catalog only |
| Weights distribution artifact | `downloadable_only` | Labeled downloadable only |

---

## 3. Rate Limiting & Upstream Protection

- Probe requests use minimal token consumption (`max_tokens: 4`, canary prompt: `"Ping"`).
- Rotating model subsets (5 models per 30-minute cycle) to respect NVIDIA Build tier limits.
- Exponential backoff with random jitter between retries (maximum 2 retries).
- Global kill switch (`PROBE_KILL_SWITCH=true`) instantly halts all outbound synthetic probes in any emergency.

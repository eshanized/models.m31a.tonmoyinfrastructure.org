<div align="center">

# ⚡ NVIDIA Build Model Intelligence Dashboard
### `models.m31a.tonmoyinfrastructure.org`

**Production-Grade Model Registry, Synthetic Observability Platform & Autonomous Agent Synchronizer**

[![CI Verification](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/ci.yml/badge.svg)](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/ci.yml)
[![Daily Catalog Sync](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/daily-catalog-sync.yml/badge.svg)](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/daily-catalog-sync.yml)
[![Synthetic Endpoint Probes](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/probe-endpoints.yml/badge.svg)](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/probe-endpoints.yml)
[![Deploy Platform](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/deploy.yml/badge.svg)](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/actions/workflows/deploy.yml)
<br>
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6.0.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.4-c5f74f?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169e1?style=flat&logo=postgresql)](https://supabase.com/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6ba300?style=flat&logo=openapiinitiative)](https://models.m31a.tonmoyinfrastructure.org/api/v1/openapi.json)
[![M31A Integrated](https://img.shields.io/badge/M31A_Agent-Integrated-8a2be2?style=flat&logo=openai)](https://models.m31a.tonmoyinfrastructure.org/data/m31a-models.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🌐 Live Dashboard](https://models.m31a.tonmoyinfrastructure.org) • [📖 API Reference](https://models.m31a.tonmoyinfrastructure.org/docs/api) • [📋 OpenAPI Spec](https://models.m31a.tonmoyinfrastructure.org/api/v1/openapi.json) • [🤖 M31A Contract](https://models.m31a.tonmoyinfrastructure.org/data/m31a-models.json) • [🏗️ Architecture](ARCHITECTURE.md)

</div>

---

## 📌 Executive Summary

**NVIDIA Build Model Intelligence Dashboard** is an enterprise-grade observability, metadata catalog, and synchronization engine for foundation models and NIM endpoints hosted on [NVIDIA Build](https://build.nvidia.com).

Designed for AI architects, platform engineers, and autonomous coding agents (including the **M31A autonomous agent**), the platform provides:
- **Canonical Model Registry**: High-precision TOML definitions as the deterministic source of truth.
- **Honest Synthetic Observability**: Real-world canary probes with Time to First Token (TTFT) and token throughput tracking without fabricated metrics.
- **Direct Agent Synchronization**: Zero-overhead JSON contract mirrors `~/.config/m31a/models_cache.json` for agent model routing.
- **Strict Anomaly Isolation**: Upstream rate limits (HTTP 429) and authentication errors (HTTP 401/403) are never conflated with actual infrastructure downtime.

---

## 🎯 Core Questions Answered

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. What models are currently active, supported, or previewed in NVIDIA Build?          │
│    ➜ Full capability matrices, modalities, publishers, architectures, context windows. │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Which model endpoints are truly operational vs degraded or failing right now?       │
│    ➜ Active synthetic canary telemetry with transparent status categorization.        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. How have response latency, TTFT, and reliability evolved over historical cycles?    │
│    ➜ Controlled, low-token canaries with rolling averages, jitter, and backoff audits. │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Capabilities & Architectural Pillars

| Pillar | Description |
| :--- | :--- |
| **📁 Canonical TOML Registry** | Pure human-and-machine-readable TOML files in `registry/models/*.toml`. Strict Zod runtime validation guarantees data integrity before any compilation or export. |
| **🔭 Transparent Observability** | Synthetic workers probe live endpoints using minimal token footprints (`max_tokens: 4`). No fabricated GPU queue loads or speculative utilization percentages. |
| **🤖 Native M31A Agent Contract** | Generates an optimized, deterministic cache specification (`/data/m31a-models.json`) enabling autonomous agents to route tasks without web scraping. |
| **🛡️ Static Observability Publication** | GitHub Actions validates, merges, retains, and commits synthetic observations to a versioned public JSON snapshot. GitHub Pages never receives runtime ingestion requests. |
| **💾 GitHub Pages Native History** | Monitoring data is committed as bounded static JSON, so status and history work without a database or permanently running backend. |
| **⚡ Cutting-Edge Stack** | Built with Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS v4, Lucide Icons, and Recharts with fluid dark/light themes. |

---

## 🏗️ Architecture & Topology

### End-to-End Discovery, Monitoring & Serving Pipeline

```mermaid
flowchart TD
    subgraph NVIDIA["Official NVIDIA Sources"]
        N1["build.nvidia.com Model Directory"]
        N2["integrate.api.nvidia.com Chat Endpoints"]
    end

    subgraph Actions["GitHub Actions"]
        W1["Daily Live Catalog Sync"]
        W2["30-minute Synthetic Probe Worker"]
        W3["Validated Static JSON Publisher"]
        W4["GitHub Pages Deployment"]
    end

    subgraph Registry["Canonical and Generated Data"]
        R1["registry/models/*.toml"]
        R2["registry/index.toml"]
        J1["catalog.json + M31A JSON"]
        J2["observability.json + bounded history"]
    end

    subgraph Site["Static Next.js Website"]
        A1["Model Explorer and Detail Pages"]
        A2["Dashboard Status and History"]
        A3["Static JSON API"]
    end

    N1 --> W1 --> R1
    R1 --> R2
    R1 --> J1
    N2 --> W2 --> W3 --> J2
    J1 --> W4
    J2 --> W4
    W4 --> A1
    W4 --> A2
    W4 --> A3
    A3 --> M31A["M31A Model Discovery Contract"]
```

---

## 📊 Honest Observability & Status Engine

Unlike tools that blindly report binary "Up/Down" states, our engine rigorously separates infrastructural outages from quota and authentication issues:

```
                              ┌────────────────────────┐
                              │ Synthetic Canary Probe │
                              └───────────┬────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
            HTTP 200 (Success)                          Non-200 Response
                   │                                             │
      ┌────────────┴────────────┐                  ┌─────────────┴─────────────┐
      ▼                         ▼                  ▼             ▼             ▼
Latency < 4000ms        Latency >= 4000ms     HTTP 401/403   HTTP 429      HTTP 5xx/Timeout
 🟢 OPERATIONAL           🟡 DEGRADED           ⚙️ UNKNOWN    🟡 DEGRADED    🔴 UNAVAILABLE
                                              (Auth Alert)   (Rate Limit)    (3+ failures)
```

### Classification Reference

| Status | Condition | Operator & Agent Impact |
| :--- | :--- | :--- |
| <kbd>**operational**</kbd> | Canary probes succeed with avg latency `< 4000ms` and `< 25%` error rate. | Healthy; safe for production agent routing. |
| <kbd>**degraded**</kbd> | Avg latency `>= 4000ms`, failure rate `>= 25%`, or upstream returns HTTP 429. | Model under heavy upstream pressure; apply fallback. |
| <kbd>**unavailable**</kbd> | `>= 3` consecutive upstream 5xx errors, connection timeouts, or socket failures. | Endpoint offline; agent immediately bypasses model. |
| <kbd>**unknown**</kbd> | Upstream returns HTTP 401/403 (invalid key / permission required). | Does **not** falsely mark model down; triggers operator key check. |
| <kbd>**stale**</kbd> | Most recent verified observation is `> 24 hours` old. | Historical record exists but lacks recent canary confirmation. |
| <kbd>**catalog_only**</kbd> | Model is listed in NVIDIA Build as a guardrail, NIM-only, or lacks inference API. | Discovered in catalog; no direct hosted endpoint available. |
| <kbd>**downloadable_only**</kbd> | Model weights available on NGC for self-hosted container deployment. | NGC downloadable container only. |

---

## 🚀 Live API Reference & Quick Examples

The platform provides a fast, cached REST API conforming to OpenAPI 3.1:

### 1. List / Search Models (`GET /api/v1/models`)

```bash
# Query operational models supporting function calling
curl -s "https://models.m31a.tonmoyinfrastructure.org/api/v1/models?status=operational&supports_tools=true" | jq .
```

<details>
<summary>Sample JSON Response</summary>

```json
{
  "total": 35,
  "page": 1,
  "limit": 50,
  "models": [
    {
      "id": "meta/llama-3.3-70b-instruct",
      "name": "Llama 3.3 70B Instruct",
      "publisher": "meta",
      "architecture": "Transformer",
      "context_window": 131072,
      "max_output_tokens": 4096,
      "supports_tools": true,
      "supports_vision": false,
      "status": "operational",
      "latency_p50_ms": 782,
      "ttft_ms": 310,
      "tokens_per_sec": 42.5
    }
  ]
}
```
</details>

### 2. Global System Status (`GET /api/v1/status`)

```bash
# Fetch global infrastructure health & canary probe summary
curl -s "https://models.m31a.tonmoyinfrastructure.org/api/v1/status" | jq .
```

### 3. Full Catalog Export (`GET /api/v1/catalog`)

```bash
# Deterministic snapshot of all models in the canonical registry
curl -s "https://models.m31a.tonmoyinfrastructure.org/api/v1/catalog" | jq .
```

### 4. Interactive OpenAPI 3.1 Spec

- Specification URL: [`/api/v1/openapi.json`](https://models.m31a.tonmoyinfrastructure.org/api/v1/openapi.json)
- Interactive Documentation UI: [`/docs/api`](https://models.m31a.tonmoyinfrastructure.org/docs/api)

---

## 🤖 M31A Autonomous Agent Integration

The **M31A autonomous coding agent** relies on verified model availability and capability parameters for automated reasoning and subagent dispatch.

### Synchronize Local Agent Cache

Run this one-liner to refresh your agent's local model cache with the verified NVIDIA catalog:

```bash
mkdir -p "$HOME/.config/m31a"
curl -s -f "https://models.m31a.tonmoyinfrastructure.org/data/m31a-models.json" \
  -o "$HOME/.config/m31a/models_cache.json"
```

### Data Contract Guarantee

Every record in `m31a-models.json` conforms to [`DATA_CONTRACT.md`](DATA_CONTRACT.md):
- Strictly sorted and normalized.
- Directly maps `slug`, `context_window`, `supports_tools`, `supports_thinking`, `service_tier`, and `truncation_policy`.
- Eliminates runtime agent failures caused by attempting unsupported tool-calls or exceeding context limits.

---

## 🛠️ Canonical Registry & Adding New Models

The source of truth lives in `registry/models/<publisher>.<model-name>.toml`.

### Example TOML Entry

```toml
id = "meta/llama-3.3-70b-instruct"
name = "Llama 3.3 70B Instruct"
publisher = "meta"
architecture = "Transformer"
version = "3.3"
description = "State-of-the-art 70B instruction-tuned model with 128k context support."
endpoint_url = "https://integrate.api.nvidia.com/v1/chat/completions"
model_type = "chat"
context_window = 131072
max_output_tokens = 4096

[capabilities]
tools = true
vision = false
audio = false
reasoning = false
structured_output = true

[pricing]
published = true
input_per_million = 0.70
output_per_million = 0.80

[provenance]
discovered_at = "2026-10-30T00:00:00Z"
verified_by = "m31a-sync-worker"
```

### Validation Workflow

```bash
# Validate all TOML models against the strict Zod schema
npm run registry:validate

# Export validated catalog to JSON artifacts and M31A contract
npm run registry:export
```

---

## 💻 Local Development & Setup

### Prerequisites

- **Node.js**: `>= 22.0.0` (Tested on Node 22 & 26)
- **npm**: `>= 10.0.0`
- **PostgreSQL**: (Optional) Supabase or local PostgreSQL instance.

### Installation

```bash
# Clone the repository
git clone https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org.git
cd models.m31a.tonmoyinfrastructure.org

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Environment Configuration (`.env`)

```env
# Public domain URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: PostgreSQL Database (omitting activates graceful static mode)
DATABASE_URL="postgresql://postgres:password@localhost:5432/m31a_models"

# Secret token for synthetic probe ingestion (generate with `openssl rand -hex 32`)
INGESTION_SECRET="your-high-entropy-ingestion-secret"

# NVIDIA Build API Key for canary probes
NVIDIA_API_KEY="nvapi-..."
```

### Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server on `localhost:3000` |
| `npm run build` | Validates, exports catalog, and compiles production build |
| `npm run start` | Runs the production Next.js server |
| `npm run typecheck` | Executes TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint checks |
| `npm test` | Runs the automated Vitest test suite |
| `npm run registry:sync` | Discovers & synchronizes models from NVIDIA Build APIs |
| `npm run registry:validate`| Validates all canonical TOML records against Zod schemas |
| `npm run registry:export`  | Exports TOML to JSON artifacts and M31A agent contract |
| `npm run probe:run` | Executes a synthetic canary monitoring cycle |
| `npm run db:migrate` | Runs versioned Drizzle ORM migrations |

---

## 🔄 Automated CI/CD & Cron Workflows

The repository uses GitHub Actions for continuous testing, catalog freshness, and monitoring:

```
.github/workflows/
├── ci.yml                 # Runs on PR & Push: typecheck, tests, schema validation & build
├── daily-catalog-sync.yml # Daily 02:00 UTC cron: queries NVIDIA, opens PR for new models
├── probe-endpoints.yml    # Runs every 30m: executes low-token canaries & ingests telemetry
└── deploy.yml             # Deploys production bundle upon merge to master
```

---

## 📂 Project Structure

```
.
├── .github/
│   ├── ISSUE_TEMPLATE/            # Form templates for Model Addition, Bugs & Features
│   ├── PULL_REQUEST_TEMPLATE.md   # Standardized checklist for pull requests
│   └── workflows/                 # CI, Daily Sync, Synthetic Probes, and Deploy
├── drizzle/
│   └── migrations/                # Versioned SQL migrations for PostgreSQL
├── public/
│   └── data/
│       ├── catalog.json           # Deterministic public catalog export
│       └── m31a-models.json       # Canonical M31A Agent Contract
├── registry/
│   ├── index.toml                 # Master model index
│   └── models/                    # Individual canonical model TOML definitions
├── scripts/
│   ├── build_static.ts            # Static build orchestrator
│   ├── export_catalog.ts          # Deterministic export pipeline
│   ├── migrate.ts                 # Drizzle migration executor
│   ├── probe_worker.ts            # Controlled synthetic canary worker
│   ├── sync_registry.ts           # Discovery crawler for NVIDIA Build
│   └── validate_registry.ts       # Strict Zod schema validator
├── src/
│   ├── app/
│   │   ├── api/v1/                # High-performance Next.js API Route Handlers
│   │   │   ├── catalog/           # Complete catalog JSON endpoint
│   │   │   ├── health/            # Liveness & readiness probes
│   │   │   ├── ingest/            # Timing-safe canary telemetry ingestion
│   │   │   ├── models/            # Filtered & paginated model search
│   │   │   ├── openapi.json/      # Dynamic OpenAPI 3.1 schema
│   │   │   └── status/            # Global platform status summary
│   │   ├── changelog/             # Model catalog addition & sync history view
│   │   ├── docs/api/              # Interactive API documentation UI
│   │   ├── models/                # Model explorer & side-by-side comparison drawer
│   │   └── page.tsx               # Homepage dashboard with real-time stats & charts
│   ├── components/                # Modular UI components (Radix, Lucide, Recharts)
│   └── lib/
│       ├── catalog.ts             # Server-side catalog loader & filters
│       ├── db/                    # Drizzle ORM schema, client & query repository
│       ├── status/                # Observability status engine & health rules
│       └── validation/            # Zod schemas for models and ingestion payloads
└── tests/                         # Vitest unit and integration test suites
```

---

## 🔒 Security & Safe Ingestion

Security is built into every layer of the platform:
- **Constant-Time Verification**: Bearer tokens are validated using `crypto.timingSafeEqual` with length guards to prevent timing side-channel attacks.
- **SSRF & Injection Prevention**: Ingested model IDs are strictly validated via regular expressions and cross-checked against canonical registry entries.
- **Clock-Skew Defense**: Incoming telemetry payloads outside a `±15 minute` window are rejected.
- **Zero Secret Leakage**: No server secrets (`NVIDIA_API_KEY`, `DATABASE_URL`, `INGESTION_SECRET`) are ever exposed in client bundles, HTML outputs, or logs.

See [`SECURITY.md`](SECURITY.md) for full threat modeling and our vulnerability disclosure process.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork & Branch**: Create a feature branch (`git checkout -b feat/add-deepseek-v3`).
2. **Add / Edit Model TOML**: Add new models under `registry/models/`.
3. **Validate**: Run `npm run registry:validate` and `npm test`.
4. **Submit PR**: Open a Pull Request using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

For bugs, enhancements, or new model suggestions, check out our [Issue Templates](https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org/issues/new/choose).

---

## 📜 Documentation Index

- [Architecture & Data Flow](ARCHITECTURE.md)
- [M31A Agent Integration Contract](DATA_CONTRACT.md)
- [Operational & Deployment Guide](OPERATIONS.md)
- [Security & Vulnerability Policy](SECURITY.md)
- [Known Upstream Limitations](KNOWN_LIMITATIONS.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
Built with ⚡ for the <strong>M31A Autonomous Agent</strong> and the global AI engineering community.
</div>

# NVIDIA Build Model Intelligence Dashboard (`models.m31a.tonmoyinfrastructure.org`)

A production-grade model intelligence dashboard and synthetic observability platform for **NVIDIA Build** foundation models and NVIDIA NIM endpoints, deeply integrated with our canonical model registry and the **M31A autonomous coding agent**.

---

## 1. System Mission & Core Answers

The platform answers three fundamental questions for systems engineers, AI architects, and autonomous agents:

1. **What models are in the catalog?**
   - Full discovery across all official NVIDIA Build foundation models, publishers, architectures, modalities, and capabilities.
   - Preserves canonical TOML records as the single source of truth.
2. **Which models have recently passed or failed endpoint availability checks?**
   - Transparent, honest classification: `operational`, `degraded`, `unavailable`, `unknown`, `stale`, `catalog_only`, and `downloadable_only`.
   - Strictly isolates authentication failures (401/403) and rate limits (429) from true upstream infrastructure downtime.
3. **How have response latency and reliability changed over time?**
   - Controlled synthetic canaries measure HTTP request duration, Time to First Token (TTFT), and token generation throughput.
   - Zero manufactured statistics or fake GPU loads.

---

## 2. Architecture & Components

```
                ┌─────────────────────────────────────────────────────────┐
                │          Official NVIDIA Discovery Sources              │
                │  https://build.nvidia.com | https://assets.ngc.nvidia.com│
                └───────────────────────────┬─────────────────────────────┘
                                            │ Daily Scheduled Workflow
                                            ▼
                ┌─────────────────────────────────────────────────────────┐
                │       Canonical TOML Registry (Source of Truth)         │
                │   registry/models/*.toml  |  registry/index.toml        │
                └───────────────┬─────────────────────────┬───────────────┘
                                │ Deterministic Export    │ Shared Contract
                                ▼                         ▼
  ┌────────────────────────────────────────┐   ┌───────────────────────────┐
  │   Next.js Application (src/data/...)   │   │  M31A Autonomous Agent    │
  │   - Next.js 16 App Router (React 19)   │   │  ~/.config/m31a/          │
  │   - Public API (/api/v1/...)           │   │  models_cache.json        │
  │   - Ingestion API (/api/v1/ingest)     │   └───────────────────────────┘
  └───────────────────▲────────────────────┘
                      │ Authenticated Ingest (timing-safe)
  ┌───────────────────┴────────────────────┐
  │  Scheduled Synthetic Probe Worker      │
  │  - Low token canaries (max_tokens=4)   │
  │  - Rotating subsets & rate limiting    │
  │  - Exponential backoff & jitter        │
  └───────────────────┬────────────────────┘
                      ▼
  ┌────────────────────────────────────────┐
  │  PostgreSQL / Supabase Storage         │
  │  (Observations, Cycles, Transitions)   │
  │  * Graceful fallback when unconfigured │
  └────────────────────────────────────────┘
```

---

## 3. Directory Layout

```
.
├── .github/workflows/
│   ├── daily-catalog-sync.yml      # Scheduled daily discovery & TOML sync
│   ├── probe-endpoints.yml         # Scheduled synthetic monitoring worker
│   └── ci.yml                      # CI typecheck, test, schema validation, build
├── drizzle/
│   └── migrations/                 # Versioned SQL migrations (PostgreSQL/Supabase)
├── registry/
│   ├── index.toml                  # Master catalog index
│   └── models/                     # Canonical per-model TOML files
├── scripts/
│   ├── sync_registry.ts            # Discovers & normalizes models to TOML
│   ├── validate_registry.ts        # Validates TOML against strict Zod schema
│   ├── export_catalog.ts           # Exports TOML to JSON & M31A contract
│   ├── probe_worker.ts             # Safe synthetic monitoring worker
│   └── migrate.ts                  # Database migration runner
├── src/
│   ├── app/                        # Next.js App Router pages & APIs
│   │   ├── api/v1/models/          # Model search & detail API
│   │   ├── api/v1/status/          # System status summary API
│   │   ├── api/v1/catalog/         # Catalog export API
│   │   ├── api/v1/health/          # Health check API
│   │   ├── api/v1/ingest/          # Protected internal ingestion API
│   │   ├── api/v1/openapi.json/    # OpenAPI 3.1 specification
│   │   ├── changelog/              # Changelog & sync health view
│   │   ├── docs/api/               # Interactive API documentation
│   │   ├── models/                 # Model Explorer & comparison drawer
│   │   └── page.tsx                # Homepage dashboard
│   ├── components/                 # UI components (Radix, Lucide, Recharts)
│   ├── lib/
│   │   ├── catalog.ts              # Server-side catalog queries & filters
│   │   ├── db/                     # Drizzle ORM schema & repository
│   │   ├── status/                 # Public status classification engine
│   │   └── validation/             # Strict Zod schemas
└── tests/                          # Automated unit & integration tests
```

---

## 4. Getting Started

### Prerequisites
- Node.js >= 22 (tested with Node 26.12)
- npm >= 10

### Installation
```bash
git clone https://github.com/eshanized/models.m31a.tonmoyinfrastructure.org.git
cd models.m31a.tonmoyinfrastructure.org
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Validate Canonical Registry
```bash
npm run registry:validate
```

### Build & Run
```bash
# Export distribution artifacts & compile production build
npm run build

# Start local production server
npm run start
```

### Run Tests
```bash
npm run test
```

---

## 5. M31A Autonomous Agent Integration

The M31A agent consumes the identical canonical catalog without relying on web rendering. The export script deterministically produces:
- `public/data/m31a-models.json` (mirrors `~/.config/m31a/models_cache.json`)

To sync your local M31A agent with the latest verified catalog:
```bash
curl -s https://models.m31a.tonmoyinfrastructure.org/data/m31a-models.json > ~/.config/m31a/models_cache.json
```

---

## 6. Deployment Target

The application is fully compatible with:
- Serverless Next.js deployment (Vercel, Cloudflare, Netlify)
- Standard Node.js Docker / Container deployment
- Supabase / Managed PostgreSQL persistence
- Completely functional in static mode if the database is not configured (honest status displays).

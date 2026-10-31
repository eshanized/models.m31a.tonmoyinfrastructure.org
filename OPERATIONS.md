# Operations Guide

## Hosting and data publication

The public dashboard is a Next.js static export on GitHub Pages. GitHub Pages cannot execute Next.js Route Handlers or accept runtime POST ingestion requests.

The application publishes two independently generated data sets:

- **Model catalog:** canonical TOML in `registry/`, synchronized from NVIDIA Build daily and exported to `src/data/catalog.json`, `public/data/catalog.json`, and the M31A contract.
- **Synthetic observability:** monitoring observations published to `src/data/observability.json` and `public/data/observability.json` every 30 minutes.

The website and static API endpoints consume these committed snapshots. No database or long-running server is required for the public dashboard.

## GitHub Actions configuration

Configure the following repository secret:

- `NVIDIA_API_KEY`: dedicated NVIDIA Build inference credential used only by the scheduled monitoring worker.

Optional repository variables:

- `PROBE_KILL_SWITCH`: set to `true` to disable outbound synthetic probes.
- `PROBE_PER_CYCLE_LIMIT`: maximum models probed per cycle (default 8, maximum 40).
- `PROBE_CONCURRENCY`: concurrent requests (default 2, maximum 5).
- `PROBE_TIMEOUT_MS`: per-request timeout (default 15000 ms).
- `PROBE_MAX_RETRIES`: bounded retries for transient failures (default 2).

The workflows use the repository-scoped `GITHUB_TOKEN` with `contents: write` to commit generated public data. The catalog and monitoring workflows explicitly invoke the reusable GitHub Pages deployment workflow after successful publication because pushes made with `GITHUB_TOKEN` do not automatically trigger other push workflows.

No `INGESTION_URL`, `INGESTION_SECRET`, or database secret is required for GitHub Pages monitoring.

## Manual operation

Run the following locally when you want to verify catalog parsing:

```bash
npm ci
npm run registry:sync
npm run registry:validate
npm run registry:export
npm run typecheck
npm test
npm run build
```

To run a live probe cycle, provide `NVIDIA_API_KEY` in the local environment:

```bash
NVIDIA_API_KEY="$NVIDIA_API_KEY" npm run probe:run
npm run probe:publish
```

The probe command writes a temporary run artifact under `.cache/`. The publisher validates model IDs and the payload schema, merges bounded history, then atomically updates both committed observability JSON files.

## Monitoring semantics

- A successful HTTP response is an observation of the shared endpoint from a GitHub-hosted runner, not a provider-wide availability guarantee.
- HTTP 401/403 is an authentication/configuration issue, not an outage.
- HTTP 429 is a rate-limit observation, not proof of provider downtime.
- Repeated server/network/timeout failures are required before the classifier reports unavailable.
- This worker uses non-streaming canaries. It records total response duration, not TTFT. TTFT remains unknown until a streaming probe measures it.
- NVIDIA Build does not expose shared-service GPU utilization or queue depth through this public monitoring pipeline. Those metrics are never inferred.

## Data retention and recovery

The publication contract retains at most 30 observations per model, 48 recent monitoring cycles, 14 days of observations, and 3000 observations total, with a 2 MiB maximum document size.

If a probe run fails, the last published snapshot remains intact. If publication or push fails, the GitHub Actions job fails and the website continues serving the last known-good snapshot. The dashboard reports freshness from the last published cycle; it does not pretend stale data is current.

If catalog discovery fails or any discovered model card cannot be validated, the catalog workflow stops before committing. Records missing from one successful listing are preserved until retirement is independently verified.

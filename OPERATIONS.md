# Operational & Deployment Guide

## 1. Initial Deployment Checklist

1. **Deploy Next.js Application**:
   - Host on Vercel, Netlify, Cloudflare Workers/Pages, or Node.js Docker.
   - Configure environment variables:
     - `NEXT_PUBLIC_APP_URL`
     - `DATABASE_URL` (optional: omit for static mode)
     - `INGESTION_SECRET` (generate using `openssl rand -hex 32`)

2. **Initialize PostgreSQL Database (if enabling persistent observability)**:
   ```bash
   # Run versioned migrations
   DATABASE_URL="postgresql://user:pass@host:5432/db" npm run db:migrate
   ```

3. **Configure GitHub Actions Secrets**:
   In your repository Settings -> Secrets and variables -> Actions:
   - `NVIDIA_API_KEY`: Server-side API key for synthetic monitoring.
   - `INGESTION_SECRET`: Must match the secret configured in the web deployment.

4. **Verify First Successful Monitoring Cycle**:
   - Trigger the `Scheduled Synthetic Endpoint Monitoring` workflow manually via GitHub Actions (`workflow_dispatch`).
   - Check workflow logs: confirm models are probed and batch payload is accepted by `/api/v1/ingest`.
   - Visit `/` and `/models`: confirm status badges update to `Operational`.

---

## 2. Disaster Recovery & Fallback Procedures

### Upstream NVIDIA API Outage
- The daily catalog sync workflow will fail gracefully and retain the last-known-good catalog.
- Previous historical observations are retained intact.
- The web dashboard marks endpoints as `unavailable` or `degraded` honestly without wiping catalog records.

### Database Outage or Maintenance
- The web application instantly and gracefully falls back to static catalog rendering (`db_persisted: false`).
- Models remain completely discoverable, searchable, filterable, and comparable.
- Observability badges report `Unknown` or `Catalog Only` without throwing 500 errors.

### Emergency Probe Halt
- Set GitHub Actions repository secret or variable `PROBE_KILL_SWITCH=true`.
- The probe worker will immediately exit before making any outbound HTTP requests.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getAllModels, getCatalogMetadata } from '../src/lib/catalog';
import { openApiSpec } from '../src/lib/openapi';
import { deriveModelStatus } from '../src/lib/status/classifier';
import { getObservabilityDocument, getObservationsForModel } from '../src/lib/observability';

const CWD = process.cwd();
const APP_API_DIR = path.join(CWD, 'src/app/api');
const STASH_API_DIR = path.join(CWD, 'src/api_routes_stashed');
const PUBLIC_API_DIR = path.join(CWD, 'public/api/v1');
const OUT_DIR = path.join(CWD, 'out');
const CNAME_FILE = path.join(CWD, 'public/CNAME');

async function main() {
  console.log('🚀 Starting Production Static Export Build...');

  // 1. Export TOML registry to canonical JSON distribution artifacts
  console.log('📦 Step 1: Exporting TOML registry...');
  execSync('npm run registry:export', { stdio: 'inherit' });

  // 2. Pre-generate static API JSON endpoints in public/api/v1
  console.log('📄 Step 2: Generating static API endpoints in public/api/v1...');
  fs.mkdirSync(PUBLIC_API_DIR, { recursive: true });

  const metadata = getCatalogMetadata();
  const models = getAllModels();

  // /api/v1/health
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: null,
    catalog: {
      status: 'synced',
      total_models: metadata.total_models,
      last_synced_at: metadata.last_synced_at,
    },
    persistence: {
      mode: 'static_json',
      status: 'available',
    },
  };
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'health'), JSON.stringify(healthData, null, 2));
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'health.json'), JSON.stringify(healthData, null, 2));

  // /api/v1/catalog
  const catalogData = {
    metadata,
    models,
  };
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'catalog'), JSON.stringify(catalogData, null, 2));
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'catalog.json'), JSON.stringify(catalogData, null, 2));

  // /api/v1/status — derived only from the published synthetic-observability snapshot.
  const observability = getObservabilityDocument();
  fs.writeFileSync(
    path.join(PUBLIC_API_DIR, 'observability.json'),
    JSON.stringify(observability, null, 2),
  );
  const perModelStatus = models.map((model) => {
    const observations = getObservationsForModel(model.id, 10);
    const derived = deriveModelStatus(
      observations,
      model.eligibility.probe_eligible,
      model.access_classification === 'downloadable',
    );
    return {
      id: model.id,
      name: model.name,
      publisher: model.publisher,
      status: derived.status,
      last_observed: derived.lastObservedAt,
      latency_ms: derived.averageLatencyMs,
      success_rate: derived.successRate,
      sample_count: derived.sampleCount,
      probe_eligible: model.eligibility.probe_eligible,
    };
  });

  const observationCount = observability.observations.length;
  const successfulObservations = observability.observations.filter(
    (item) => item.result_category === 'success',
  ).length;
  const statusSummary = {
    total_models: models.length,
    operational: perModelStatus.filter((model) => model.status === 'operational').length,
    degraded: perModelStatus.filter((model) => model.status === 'degraded').length,
    unavailable: perModelStatus.filter((model) => model.status === 'unavailable').length,
    unknown: perModelStatus.filter((model) => model.status === 'unknown').length,
    stale: perModelStatus.filter((model) => model.status === 'stale').length,
    catalog_only: perModelStatus.filter((model) => model.status === 'catalog_only').length,
    downloadable_only: perModelStatus.filter((model) => model.status === 'downloadable_only').length,
    probe_eligible_total: models.filter((model) => model.eligibility.probe_eligible).length,
    last_probe_cycle_at: observability.last_successful_cycle_at,
    recent_cycles_count: observability.recent_cycles.length,
    total_observations: observationCount,
    success_rate_percentage: observationCount > 0
      ? Number(((successfulObservations / observationCount) * 100).toFixed(2))
      : null,
  };
  const statusData = {
    generated_at: observability.generated_at,
    summary: statusSummary,
    models: perModelStatus,
  };
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'status'), JSON.stringify(statusData, null, 2));
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'status.json'), JSON.stringify(statusData, null, 2));

  // /api/v1/openapi.json
  fs.writeFileSync(path.join(PUBLIC_API_DIR, 'openapi.json'), JSON.stringify(openApiSpec, null, 2));

  // Ensure public/CNAME
  fs.writeFileSync(CNAME_FILE, 'models.m31a.tonmoyinfrastructure.org\n');

  // 3. Stash dynamic src/app/api to avoid static export conflict
  let stashed = false;
  if (fs.existsSync(APP_API_DIR)) {
    console.log('🔄 Step 3: Stashing dynamic server API routes for clean static export...');
    fs.renameSync(APP_API_DIR, STASH_API_DIR);
    stashed = true;
  }

  try {
    // 4. Run Next.js static export build
    console.log('🔨 Step 4: Compiling static pages with Next.js...');
    execSync('npx next build', { stdio: 'inherit' });

    // 5. Post-build assets for GitHub Pages
    console.log('✨ Step 5: Finalizing GitHub Pages artifacts...');
    fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
    fs.writeFileSync(path.join(OUT_DIR, 'CNAME'), 'models.m31a.tonmoyinfrastructure.org\n');

    console.log('🎉 Production static export build succeeded completely!');
  } finally {
    // Always restore stashed API routes
    if (stashed && fs.existsSync(STASH_API_DIR)) {
      console.log('🔄 Restoring server API routes...');
      fs.renameSync(STASH_API_DIR, APP_API_DIR);
    }
  }
}

main().catch((err) => {
  console.error('❌ Static export build failed:', err);
  // Restore if needed
  if (fs.existsSync(STASH_API_DIR)) {
    fs.renameSync(STASH_API_DIR, APP_API_DIR);
  }
  process.exit(1);
});

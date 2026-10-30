import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getAllModels, getCatalogMetadata } from '../src/lib/catalog';
import { openApiSpec } from '../src/lib/openapi';

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
    uptime_seconds: 86400,
    catalog: {
      status: 'synced',
      total_models: metadata.total_models,
      last_synced_at: metadata.last_synced_at,
    },
    persistence: {
      mode: 'static_fallback',
      status: 'operational',
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

  // /api/v1/status
  const statusSummary = {
    total_models: models.length,
    operational: 0,
    degraded: 0,
    unavailable: 0,
    unknown: 0,
    stale: 0,
    catalog_only: models.filter((m) => !m.eligibility.probe_eligible).length,
    downloadable_only: 0,
    probe_eligible_total: models.filter((m) => m.eligibility.probe_eligible).length,
    last_probe_cycle_at: null,
    uptime_percentage: 100.0,
  };
  const statusData = {
    generated_at: new Date().toISOString(),
    summary: statusSummary,
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      publisher: m.publisher,
      status: m.eligibility.probe_eligible ? 'unknown' : 'catalog_only',
      last_observed: null,
      probe_eligible: m.eligibility.probe_eligible,
    })),
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

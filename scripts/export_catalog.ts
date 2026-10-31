import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'smol-toml';
import { CanonicalModel, M31AModelCacheEntry, RegistryIndex } from '../src/lib/types/registry';
import { CanonicalModelSchema, RegistryIndexSchema } from '../src/lib/validation/registry';

const REGISTRY_DIR = path.resolve(process.cwd(), 'registry');
const MODELS_DIR = path.join(REGISTRY_DIR, 'models');
const INDEX_PATH = path.join(REGISTRY_DIR, 'index.toml');

const SRC_DATA_DIR = path.resolve(process.cwd(), 'src/data');
const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public/data');

// Ensure output dirs exist
fs.mkdirSync(SRC_DATA_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

export function exportCatalog() {
  console.log('📦 Exporting canonical TOML registry to JSON distribution artifacts...');

  // 1. Read & Validate Index
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Registry index not found: ${INDEX_PATH}`);
  }
  const indexToml = fs.readFileSync(INDEX_PATH, 'utf-8');
  const indexData = RegistryIndexSchema.parse(parse(indexToml));

  // 2. Read all model TOML files
  const files = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.toml'));
  const models: CanonicalModel[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(MODELS_DIR, file), 'utf-8');
    const model = CanonicalModelSchema.parse(parse(raw));
    models.push(model);
  }

  // Sort models deterministically
  models.sort((a, b) => a.id.localeCompare(b.id));

  // Build website catalog payload
  const catalogPayload = {
    schema_version: indexData.schema_version,
    generated_at: new Date().toISOString(),
    last_synced_at: indexData.last_synced_at,
    total_models: models.length,
    publishers: indexData.publishers,
    modalities: indexData.modalities,
    models,
  };

  // Build M31A autonomous agent contract payload
  const m31aPayload: M31AModelCacheEntry[] = models.map((m) => {
    let serviceTier: 'standard' | 'fast' | 'reasoning' = 'standard';
    if (m.capabilities.reasoning) serviceTier = 'reasoning';
    else if (m.context_window && m.context_window <= 8192) serviceTier = 'fast';

    return {
      slug: m.id,
      display_name: m.name,
      description: m.description,
      context_window: m.context_window,
      max_output_tokens: m.max_output_tokens,
      supports_tools: m.capabilities.tool_calling,
      supports_thinking: m.capabilities.reasoning,
      supports_vision: m.capabilities.vision,
      supports_audio: m.capabilities.audio,
      default_temperature: 0.2,
      tool_mode: m.capabilities.tool_calling === true ? 'direct' : m.capabilities.tool_calling === false ? 'unsupported' : 'unknown',
      input_modalities: m.input_modalities,
      truncation_policy: 'truncate',
      service_tier: serviceTier,
      multi_agent_version: 1,
      auto_compact_threshold_percent: 75,
      instructions_template: null,
      requires_auth: true,
      is_default: m.id === 'nvidia/nemotron-3.5-lightning-30b-a3b',
      originator: m.publisher,
    };
  });

  // Write outputs
  const catalogJsonStr = JSON.stringify(catalogPayload, null, 2);
  const m31aJsonStr = JSON.stringify(m31aPayload, null, 2);

  fs.writeFileSync(path.join(SRC_DATA_DIR, 'catalog.json'), catalogJsonStr, 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'catalog.json'), catalogJsonStr, 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'm31a-models.json'), m31aJsonStr, 'utf-8');

  // Also write changelog if it does not exist
  const changelogPath = path.join(SRC_DATA_DIR, 'changelog.json');
  if (!fs.existsSync(changelogPath)) {
    const initialChangelog = [
      {
        id: 'cl-init-001',
        timestamp: new Date().toISOString(),
        type: 'initial_catalog_baseline',
        title: 'Initial Canonical Registry Ingestion',
        description: `Imported ${models.length} foundation and instruct models across ${indexData.publishers.length} publishers from official NVIDIA Build API catalog.`,
        affected_models_count: models.length,
        author: 'NVIDIA Build Registry Synchronizer',
      },
    ];
    fs.writeFileSync(changelogPath, JSON.stringify(initialChangelog, null, 2), 'utf-8');
  }

  console.log(`✅ Export complete:`);
  console.log(`   - ${path.join(SRC_DATA_DIR, 'catalog.json')} (${models.length} models)`);
  console.log(`   - ${path.join(PUBLIC_DATA_DIR, 'catalog.json')}`);
  console.log(`   - ${path.join(PUBLIC_DATA_DIR, 'm31a-models.json')} (M31A contract)`);
}

if (require.main === module || process.argv[1]?.includes('export_catalog')) {
  try {
    exportCatalog();
  } catch (err) {
    console.error('❌ Export failed:', (err as Error).message);
    process.exit(1);
  }
}

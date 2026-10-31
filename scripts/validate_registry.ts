import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'smol-toml';
import { CanonicalModelSchema, RegistryIndexSchema } from '../src/lib/validation/registry';

const REGISTRY_DIR = path.resolve(process.cwd(), 'registry');
const MODELS_DIR = path.join(REGISTRY_DIR, 'models');
const INDEX_PATH = path.join(REGISTRY_DIR, 'index.toml');

export function validateRegistry(): { valid: boolean; totalModels: number } {
  console.log('🔍 Validating canonical TOML registry schema...');

  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Registry index file not found at: ${INDEX_PATH}`);
  }

  const rawIndexToml = fs.readFileSync(INDEX_PATH, 'utf-8');
  const indexData = parse(rawIndexToml);
  const validatedIndex = RegistryIndexSchema.parse(indexData);
  console.log(`✓ Index schema valid (schema_version: ${validatedIndex.schema_version}, models: ${validatedIndex.total_models})`);

  if (!fs.existsSync(MODELS_DIR)) {
    throw new Error(`Registry models directory not found at: ${MODELS_DIR}`);
  }

  const modelFiles = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.toml'));
  if (modelFiles.length === 0) {
    throw new Error(`No TOML model files found in: ${MODELS_DIR}`);
  }

  const modelIdsInFiles = new Set<string>();

  for (const file of modelFiles) {
    const filePath = path.join(MODELS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parse(content);
    const validatedModel = CanonicalModelSchema.parse(parsed);

    if (modelIdsInFiles.has(validatedModel.id)) {
      throw new Error(`Duplicate model ID detected in registry: ${validatedModel.id} (${file})`);
    }
    modelIdsInFiles.add(validatedModel.id);
  }

  console.log(`✓ Validated ${modelFiles.length} individual model TOML files successfully.`);

  if (validatedIndex.total_models !== modelFiles.length) {
    throw new Error(`Index total_models (${validatedIndex.total_models}) does not match TOML file count (${modelFiles.length})`);
  }
  if (validatedIndex.models.length !== modelFiles.length) {
    throw new Error(`Index model entries (${validatedIndex.models.length}) do not match TOML file count (${modelFiles.length})`);
  }

  // Verify alignment between index and individual files
  const indexIds = new Set(validatedIndex.models.map((m) => m.id));
  if (indexIds.size !== validatedIndex.models.length) {
    throw new Error('Duplicate model IDs detected in registry/index.toml');
  }
  for (const id of modelIdsInFiles) {
    if (!indexIds.has(id)) {
      throw new Error(`Model ${id} exists in models/ directory but is missing from index.toml`);
    }
  }

  for (const id of indexIds) {
    if (!modelIdsInFiles.has(id)) {
      throw new Error(`Model ${id} is listed in index.toml but has no corresponding TOML file`);
    }
  }

  console.log('✅ Registry verification passed completely. Canonical schema integrity confirmed.');
  return { valid: true, totalModels: modelFiles.length };
}

if (require.main === module || process.argv[1]?.includes('validate_registry')) {
  try {
    validateRegistry();
  } catch (err) {
    console.error('❌ Registry validation failed:', (err as Error).message);
    process.exit(1);
  }
}

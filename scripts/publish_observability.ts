import fs from 'node:fs';
import path from 'node:path';
import { getAllModels } from '../src/lib/catalog';
import {
  emptyObservabilityDocument,
  ObservabilityDocumentSchema,
  ProbeArtifactSchema,
  mergeObservabilityDocument,
} from '../src/lib/observability-contract';

const ROOT = process.cwd();
const ARTIFACT_PATH = path.join(ROOT, '.cache', 'observability-run.json');
const PUBLIC_PATH = path.join(ROOT, 'public', 'data', 'observability.json');
const SOURCE_PATH = path.join(ROOT, 'src', 'data', 'observability.json');
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Cannot parse ${path.relative(ROOT, filePath)}: ${(error as Error).message}`);
  }
}

function atomicWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporaryPath, filePath);
}

export function publishObservability(root = ROOT, now = new Date()): boolean {
  const artifactPath = path.join(root, '.cache', 'observability-run.json');
  const publicPath = path.join(root, 'public', 'data', 'observability.json');
  const sourcePath = path.join(root, 'src', 'data', 'observability.json');

  const rawArtifact = readJsonFile(artifactPath);
  if (rawArtifact === null) {
    console.log('No probe artifact was produced; monitoring cycle was intentionally skipped.');
    return false;
  }

  const artifact = ProbeArtifactSchema.parse(rawArtifact);
  const knownModels = new Map(getAllModels().map((model) => [model.id, model]));
  for (const observation of artifact.observations) {
    const model = knownModels.get(observation.model_id);
    if (!model || !model.eligibility.probe_eligible) {
      throw new Error(`Probe artifact contains an unknown or ineligible model: ${observation.model_id}`);
    }
    if (observation.run_id !== artifact.cycle.run_id) {
      throw new Error(`Probe artifact run ID does not match cycle for ${observation.model_id}`);
    }
  }

  const previousRaw = readJsonFile(publicPath);
  const previous = previousRaw === null
    ? emptyObservabilityDocument(now)
    : ObservabilityDocumentSchema.parse(previousRaw);
  const merged = mergeObservabilityDocument(previous, artifact, now);
  const serialized = `${JSON.stringify(merged, null, 2)}\n`;

  if (Buffer.byteLength(serialized, 'utf8') > MAX_DOCUMENT_BYTES) {
    throw new Error('Observability snapshot exceeded the 2 MiB publication limit');
  }

  atomicWrite(publicPath, serialized);
  atomicWrite(sourcePath, serialized);
  console.log(
    `Published ${artifact.observations.length} observations; retained ${merged.observations.length} historical observations.`,
  );
  return true;
}

if (require.main === module || process.argv[1]?.endsWith('publish_observability')) {
  try {
    publishObservability();
  } catch (error) {
    console.error('Observability publication failed:', (error as Error).message);
    process.exit(1);
  }
}

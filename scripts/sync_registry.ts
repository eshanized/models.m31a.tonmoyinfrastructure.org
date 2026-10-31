import fs from 'node:fs';
import path from 'node:path';
import { stringify, parse } from 'smol-toml';
import { CanonicalModel, RegistryIndex } from '../src/lib/types/registry';
import { CanonicalModelSchema } from '../src/lib/validation/registry';

// Paths
const REGISTRY_DIR = path.resolve(process.cwd(), 'registry');
const MODELS_DIR = path.join(REGISTRY_DIR, 'models');
const INDEX_PATH = path.join(REGISTRY_DIR, 'index.toml');
const RAW_CACHE_DIR = path.resolve(process.cwd(), '.cache/nvidia_build_raw');

// Ensure directories exist
fs.mkdirSync(MODELS_DIR, { recursive: true });
fs.mkdirSync(RAW_CACHE_DIR, { recursive: true });

function parseYamlSimple(str: string): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const line of str.split('\n')) {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      obj[key] = val;
    }
  }
  return obj;
}

function resolveFamily(id: string, text: string): string | null {
  const lower = id.toLowerCase() + ' ' + text.toLowerCase();
  if (lower.includes('llama-3.3') || lower.includes('llama 3.3')) return 'Llama 3.3';
  if (lower.includes('llama-3.2') || lower.includes('llama 3.2')) return 'Llama 3.2';
  if (lower.includes('llama-3.1') || lower.includes('llama 3.1')) return 'Llama 3.1';
  if (lower.includes('llama-3') || lower.includes('llama 3')) return 'Llama 3';
  if (lower.includes('nemotron')) return 'Nemotron';
  if (lower.includes('nemoguard')) return 'NeMo Guard';
  if (lower.includes('mistral') || lower.includes('mixtral')) return 'Mistral';
  if (lower.includes('diffusiongemma') || lower.includes('gemma')) return 'Gemma';
  if (lower.includes('cosmos')) return 'Cosmos';
  if (lower.includes('deepseek')) return 'DeepSeek';
  if (lower.includes('qwen')) return 'Qwen';
  if (lower.includes('flux')) return 'FLUX';
  if (lower.includes('evo2') || lower.includes('evo 2')) return 'Evo 2';
  if (lower.includes('parakeet')) return 'Parakeet';
  if (lower.includes('kumo')) return 'Kumo';
  if (lower.includes('whisper')) return 'Whisper';
  if (lower.includes('boltz')) return 'Boltz';
  if (lower.includes('openfold')) return 'OpenFold';
  if (lower.includes('rfdiffusion') || lower.includes('rfd4')) return 'RFdiffusion';
  if (lower.includes('step-5')) return 'Step';
  if (lower.includes('wan2')) return 'Wan';
  return null;
}

function resolveArchitecture(text: string, id: string): string | null {
  const archMatch = text.match(/\*\*Architecture Type:\*\*\s*([^\r\n]+)/i);
  const netMatch = text.match(/\*\*Network Architecture:\*\*\s*([^\r\n]+)/i);
  if (netMatch && netMatch[1].trim()) {
    const net = netMatch[1].trim();
    if (archMatch && archMatch[1].trim()) return `${archMatch[1].trim()} (${net})`;
    return net;
  }
  if (archMatch && archMatch[1].trim()) return archMatch[1].trim();

  const lower = (id + ' ' + text).toLowerCase();
  if (lower.includes('moe') || lower.includes('mixture of experts') || lower.includes('mixture-of-experts')) {
    return 'Mixture of Experts (MoE) Transformer';
  }
  if (lower.includes('diffusion') || lower.includes('dit') || lower.includes('flux')) {
    return 'Diffusion Transformer (DiT)';
  }
  if (lower.includes('cnn') || lower.includes('convolutional')) {
    return 'Convolutional Neural Network (CNN)';
  }
  if (lower.includes('conformer') || lower.includes('ctc') || lower.includes('rnnt') || lower.includes('tdt')) {
    return 'Conformer ASR Architecture';
  }
  if (lower.includes('mamba') || lower.includes('ssm')) {
    return 'State Space Model (SSM) Hybrid';
  }
  return null;
}

function resolvePricing(_id: string, _text: string): CanonicalModel['pricing'] {
  // NVIDIA Build pricing is not safely derivable from a model name or parameter count.
  // Leave rates unknown until a model-specific authoritative price source is parsed.
  return {
    currency: 'USD',
    input_per_million: null,
    output_per_million: null,
    status: 'not_published',
    source: null,
    provenance_note: 'No verified model-specific pricing source is available in the catalog sync.',
  };
}

export async function syncRegistry() {
  console.log('🔄 Starting Canonical NVIDIA Registry Synchronization from build.nvidia.com...');

  // 1. Fetch the official NVIDIA model directory. Never fall back to cached
  // discovery data: a stale cache must not be mistaken for a successful sync.
  const modelsMdUrl = 'https://build.nvidia.com/models.md';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let mdContent = '';
  try {
    const res = await fetch(modelsMdUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'M31A-NVIDIA-Model-Registry/1.0' },
    });
    if (!res.ok) {
      throw new Error(`NVIDIA models directory returned HTTP ${res.status}`);
    }
    mdContent = await res.text();
  } finally {
    clearTimeout(timeout);
  }
  if (mdContent.trim().length < 100) {
    throw new Error('NVIDIA models directory response is unexpectedly small; refusing to publish');
  }
  fs.writeFileSync(path.join(RAW_CACHE_DIR, 'models.md'), mdContent);

  // Parse only official model-card Markdown links.
  const targetPaths = new Set<string>();
  for (const line of mdContent.split('\n')) {
    const match = line.match(/^\s*-\s*\[(.*?)\]\((.*?)\)\s*[—-]\s*(.*)$/);
    if (!match?.[2]) continue;
    const parsed = new URL(match[2], 'https://build.nvidia.com');
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'build.nvidia.com') continue;
    if (!/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.md$/.test(parsed.pathname)) continue;
    targetPaths.add(parsed.pathname);
  }

  if (targetPaths.size < Number(process.env.REGISTRY_MIN_DISCOVERED_MODELS || 50)) {
    throw new Error(`Only ${targetPaths.size} models discovered; below safety floor. Refusing to prune or publish.`);
  }

  // 2. Fetch and parse each model markdown card
  const syncedModels: CanonicalModel[] = [];
  const existingFiles = new Set(fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.toml')));
  const existingModels = new Map<string, CanonicalModel>();
  for (const file of existingFiles) {
    const existing = CanonicalModelSchema.parse(parse(fs.readFileSync(path.join(MODELS_DIR, file), 'utf-8')));
    existingModels.set(existing.id, existing);
  }
  const stagedRecords: Array<{ tomlPath: string; tomlString: string }> = [];

  for (const relPath of targetPaths) {
    let cardContent = '';

    const fullUrl = 'https://build.nvidia.com' + relPath;
    const cardController = new AbortController();
    const cardTimeout = setTimeout(() => cardController.abort(), 20_000);
    try {
      const res = await fetch(fullUrl, {
        signal: cardController.signal,
        headers: { 'User-Agent': 'M31A-NVIDIA-Model-Registry/1.0' },
      });
      if (!res.ok) throw new Error(`Model card ${relPath} returned HTTP ${res.status}`);
      cardContent = await res.text();
    } finally {
      clearTimeout(cardTimeout);
    }
    if (cardContent.length < 80) throw new Error(`Model card ${relPath} is unexpectedly small`);
    const frontmatch = cardContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatch) throw new Error(`Model card ${relPath} has unrecognized front matter; refusing partial sync`);

    const meta = parseYamlSimple(frontmatch[1]);
    const canonical = meta.canonical || '';
    const id = canonical.replace('https://build.nvidia.com/', '').trim();
    if (!id || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(id)) {
      throw new Error(`Model card ${relPath} has an invalid canonical ID`);
    }

    const publisher = meta.publisher || id.split('/')[0] || 'nvidia';
    const name = meta.title || id.split('/')[1] || id;
    const description = meta.description || 'NVIDIA NIM container model available on NVIDIA Build';
    const lower = cardContent.toLowerCase();

    // Modality derivation
    const input_modalities: Array<'text' | 'image' | 'audio' | 'video' | 'embedding'> = [];
    if (lower.includes('audio') || lower.includes('speech') || lower.includes('voice') || lower.includes('asr') || lower.includes('tts') || lower.includes('sound')) {
      input_modalities.push('audio');
    }
    if (lower.includes('image') || lower.includes('video') || lower.includes('vision') || lower.includes('rgb') || lower.includes('visual')) {
      input_modalities.push('image');
    }
    if (lower.includes('video') || lower.includes('frames') || lower.includes('motion')) {
      if (!input_modalities.includes('video')) input_modalities.push('video');
    }
    if (input_modalities.length === 0 || lower.includes('text') || lower.includes('tokens') || lower.includes('prompt')) {
      input_modalities.unshift('text');
    }

    const output_modalities: Array<'text' | 'image' | 'audio' | 'video' | 'embedding'> = [];
    if (lower.includes('diffusion') || lower.includes('image generation') || lower.includes('text-to-image') || lower.includes('image-to-image') || lower.includes('flux')) {
      output_modalities.push('image');
    }
    if (lower.includes('video generation') || lower.includes('text-to-video') || lower.includes('generates physics-aware video') || lower.includes('video world')) {
      output_modalities.push('video');
    }
    if (lower.includes('text-to-speech') || lower.includes('tts') || lower.includes('expressive voices') || lower.includes('generates audio')) {
      output_modalities.push('audio');
    }
    if (lower.includes('embedding') || lower.includes('dense vector') || lower.includes('retrieval representing')) {
      output_modalities.push('embedding');
    }
    if (output_modalities.length === 0) {
      output_modalities.push('text');
    }

    // Endpoint type & protocol
    let endpoint_type: CanonicalModel['endpoint_type'] = 'completion';
    let protocol: CanonicalModel['protocol'] = 'nim-custom';

    const lowerId = id.toLowerCase();

    if (lowerId.includes('embed') && !lowerId.includes('rerank')) {
      endpoint_type = 'embedding';
    } else if (lowerId.includes('rerank')) {
      endpoint_type = 'reranking';
    } else if (lowerId.includes('guard') || lowerId.includes('jailbreak') || lowerId.includes('safety-guard') || lowerId.includes('content-safety') || lowerId.includes('topic-control')) {
      endpoint_type = 'guardrail';
    } else if (lowerId.includes('asr') || lowerId.includes('tts') || lowerId.includes('whisper') || lowerId.includes('canary') || lowerId.includes('parakeet') || lowerId.includes('chatterbox') || lowerId.includes('studiovoice') || lowerId.includes('conformer') || lowerId.includes('lipsync') || lowerId.includes('translate')) {
      endpoint_type = 'audio_speech';
    } else if (lowerId.includes('flux') || lowerId.includes('diffusion') || lowerId.includes('image-edit') || lowerId.includes('stable-diffusion') || lowerId.includes('trellis') || lowerId.includes('relighting')) {
      endpoint_type = 'image_generation';
    } else if (lowerId.includes('vision') || lowerId.includes('ocr') || lowerId.includes('parse') || lowerId.includes('pose') || lowerId.includes('paligemma') || lowerId.includes('bevformer') || lowerId.includes('eyecontact') || lowerId.includes('speaker-detection') || lowerId.includes('body-pose') || lowerId.includes('paddleocr')) {
      endpoint_type = 'visual_language';
    } else if (
      lowerId.includes('boltz') ||
      lowerId.includes('diffdock') ||
      lowerId.includes('openfold') ||
      lowerId.includes('protein') ||
      lowerId.includes('molmim') ||
      lowerId.includes('genmol') ||
      lowerId.includes('rfdiffusion') ||
      lowerId.includes('cuopt') ||
      lowerId.includes('fourcastnet') ||
      lowerId.includes('fluent') ||
      lowerId.includes('fidelity') ||
      lowerId.includes('msa-search')
    ) {
      endpoint_type = 'completion';
    } else if (
      cardContent.includes('/chat/completions') ||
      cardContent.includes('chat.completions') ||
      lowerId.includes('instruct') ||
      lowerId.includes('chat') ||
      lowerId.includes('flash') ||
      lowerId.includes('reasoner') ||
      lowerId.includes('bolt') ||
      lowerId.includes('large')
    ) {
      endpoint_type = 'chat';
      protocol = 'openai-chat';
    }

    if (cardContent.includes('/chat/completions') || cardContent.includes('chat.completions')) {
      protocol = 'openai-chat';
    }

    // Context length
    let context_window: number | null = null;
    const ctxMatch = cardContent.match(/Context Length:?\*\*?\s*([\d,]+)/i) || cardContent.match(/(\d[\d,]*)\s*(?:-token|token)\s*context/i);
    if (ctxMatch) {
      const parsed = parseInt(ctxMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) context_window = parsed;
    }

    // Documentation URLs
    const docUrls: string[] = [];
    const linkMatches = cardContent.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s\)\"]+)\)/g);
    for (const lm of linkMatches) {
      const u = lm[2];
      if (!u.includes('build.nvidia.com') && !docUrls.includes(u)) {
        docUrls.push(u);
      }
    }
    if (docUrls.length === 0) {
      docUrls.push(canonical || `https://build.nvidia.com/${id}`);
    }

    // License
    let license: string | null = null;
    const licMatch = cardContent.match(/## License(?: and Terms of Use|\/Terms of [uU]se)?[:\s]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (licMatch) {
      license = licMatch[1].trim().slice(0, 300);
    }

    // Capabilities
    const hasChat = endpoint_type === 'chat' || cardContent.includes('chat.completions');
    const hasVision = input_modalities.includes('image') || output_modalities.includes('image');
    const hasAudio = input_modalities.includes('audio') || output_modalities.includes('audio');
    const hasVideo = input_modalities.includes('video') || output_modalities.includes('video');
    const hasReasoning = lower.includes('reasoning: supported') || lower.includes('reasoning model') || lower.includes('structured reasoning');
    const hasToolCalling = lower.includes('function calling: supported') || lower.includes('tool calling') || lower.includes('tool-calling');

    const capabilities = {
      chat: hasChat ? true : null,
      completion: endpoint_type === 'chat' || endpoint_type === 'completion' ? true : null,
      vision: hasVision ? true : null,
      audio: hasAudio ? true : null,
      video: hasVideo ? true : null,
      embedding: endpoint_type === 'embedding' ? true : null,
      reranking: endpoint_type === 'reranking' ? true : null,
      reasoning: hasReasoning ? true : null,
      structured_output: lower.includes('structured outputs') ? true : null,
      tool_calling: hasToolCalling ? true : null,
    };

    const probeEligible = protocol === 'openai-chat' && endpoint_type === 'chat';

    const modelRecord: CanonicalModel = {
      id,
      name,
      publisher,
      family: resolveFamily(id, cardContent),
      architecture: resolveArchitecture(cardContent, id),
      official_detail_url: canonical || `https://build.nvidia.com/${id}`,
      documentation_urls: docUrls.slice(0, 5),
      description,
      catalog_status: id.includes('preview') ? 'preview' : 'active',
      first_seen_at: existingModels.get(id)?.first_seen_at || new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      endpoint_type,
      protocol,
      access_classification: 'free_endpoint',
      input_modalities,
      output_modalities,
      capabilities,
      context_window,
      max_output_tokens: null,
      pricing: resolvePricing(id, cardContent),
      license,
      usage_restrictions: null,
      provenance: {
        source_url: canonical || `https://build.nvidia.com/${id}`,
        source_type: 'official_directory',
        observed_at: new Date().toISOString(),
        confidence: 1.0,
      },
      eligibility: {
        probe_eligible: probeEligible,
        probe_endpoint: probeEligible ? 'https://integrate.api.nvidia.com/v1/chat/completions' : null,
        test_messages: probeEligible ? [{ role: 'user', content: 'Respond with PONG' }] : null,
        max_probe_tokens: 4,
      },
      verified_at: new Date().toISOString(),
      deprecation_notice: null,
    };

    // Strict validation
    const validated = CanonicalModelSchema.parse(modelRecord);
    syncedModels.push(validated);

    // Stage canonical TOML until every source record has passed validation.
    const safeFilename = `${validated.id.replace(/\//g, '__')}.toml`;
    stagedRecords.push({
      tomlPath: path.join(MODELS_DIR, safeFilename),
      tomlString: stringify(validated),
    });
  }

  const minimumModels = Number(process.env.REGISTRY_MIN_DISCOVERED_MODELS || 50);
  if (syncedModels.length < minimumModels) {
    throw new Error(`Only ${syncedModels.length} model cards parsed; minimum is ${minimumModels}. No registry files were changed.`);
  }
  if (syncedModels.length !== targetPaths.size) {
    throw new Error(`Discovered ${targetPaths.size} model pages but parsed ${syncedModels.length}; refusing partial publication.`);
  }

  // Preserve models that disappear from a single listing snapshot. Retirement must
  // be a separate, explicitly verified operation rather than a side effect of scraping.
  const mergedModels = new Map(existingModels);
  for (const model of syncedModels) mergedModels.set(model.id, model);
  const allModels = [...mergedModels.values()].sort((a, b) => a.id.localeCompare(b.id));

  // All upstream records have been fetched and validated. Only now touch canonical files.
  for (const record of stagedRecords) {
    fs.writeFileSync(record.tomlPath, record.tomlString);
  }

  // Build Registry Index
  const publishers = Array.from(new Set(allModels.map((m) => m.publisher))).sort();
  const allModalities = Array.from(
    new Set(allModels.flatMap((m) => [...m.input_modalities, ...m.output_modalities]))
  ) as Array<'text' | 'image' | 'audio' | 'video' | 'embedding'>;

  const index: RegistryIndex = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    total_models: allModels.length,
    publishers,
    modalities: allModalities,
    models: allModels.map((m) => ({
      id: m.id,
      name: m.name,
      publisher: m.publisher,
      access_classification: m.access_classification,
      endpoint_type: m.endpoint_type,
      context_window: m.context_window,
      probe_eligible: m.eligibility.probe_eligible,
      input_modalities: m.input_modalities,
      output_modalities: m.output_modalities,
      capabilities: m.capabilities,
    })),
  };

  const indexTempPath = `${INDEX_PATH}.tmp`;
  fs.writeFileSync(indexTempPath, stringify(index));
  fs.renameSync(indexTempPath, INDEX_PATH);
  console.log(`📇 Generated registry index at ${INDEX_PATH} with ${index.total_models} models and ${publishers.length} publishers`);
}

// Run if called directly
if (require.main === module || process.argv[1]?.endsWith('sync_registry.ts')) {
  syncRegistry().catch((err) => {
    console.error('❌ Registry sync failed:', err);
    process.exit(1);
  });
}

import { describe, it, expect } from 'vitest';
import { CanonicalModelSchema, RegistryIndexSchema } from '../src/lib/validation/registry';

describe('Canonical Registry Schema & Validation', () => {
  it('accepts valid canonical model definitions', () => {
    const validModel = {
      id: 'meta/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      publisher: 'meta',
      family: 'Llama 3.3',
      architecture: 'Transformer',
      official_detail_url: 'https://build.nvidia.com/meta/llama-3.3-70b-instruct',
      documentation_urls: ['https://docs.nvidia.com/nim/'],
      description: 'Llama 3.3 70B foundation model',
      catalog_status: 'active',
      first_seen_at: '2026-01-01T00:00:00.000Z',
      last_seen_at: '2026-10-30T00:00:00.000Z',
      endpoint_type: 'chat',
      protocol: 'openai-chat',
      access_classification: 'free_endpoint',
      input_modalities: ['text'],
      output_modalities: ['text'],
      capabilities: {
        chat: true,
        completion: true,
        vision: false,
        audio: false,
        video: false,
        embedding: false,
        reranking: false,
        reasoning: false,
        structured_output: true,
        tool_calling: true,
      },
      context_window: 131072,
      max_output_tokens: 4096,
      pricing: {
        currency: 'USD',
        input_per_million: 0.70,
        output_per_million: 0.70,
        status: 'published',
        source: 'https://build.nvidia.com/pricing',
      },
      license: 'Meta Llama 3 Community License',
      usage_restrictions: 'Standard terms',
      provenance: {
        source_url: 'https://build.nvidia.com/meta/llama-3.3-70b-instruct',
        source_type: 'official_directory',
        observed_at: '2026-10-30T00:00:00.000Z',
        confidence: 0.99,
      },
      eligibility: {
        probe_eligible: true,
        probe_endpoint: '/v1/chat/completions',
        test_messages: [{ role: 'user', content: 'Ping' }],
        max_probe_tokens: 4,
      },
      verified_at: '2026-10-30T00:00:00.000Z',
    };

    const parsed = CanonicalModelSchema.safeParse(validModel);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid model IDs without publisher prefix', () => {
    const invalidModel = {
      id: 'just-model-name-without-publisher',
      name: 'Invalid Model',
      publisher: 'unknown',
    };

    const parsed = CanonicalModelSchema.safeParse(invalidModel);
    expect(parsed.success).toBe(false);
  });

  it('handles null and optional fields honestly without manufacturing defaults', () => {
    const modelWithNulls = {
      id: 'nvidia/test-model',
      name: 'Test Model',
      publisher: 'nvidia',
      official_detail_url: 'https://build.nvidia.com/nvidia/test-model',
      documentation_urls: [],
      description: 'Test model',
      catalog_status: 'active',
      first_seen_at: '2026-01-01T00:00:00.000Z',
      last_seen_at: '2026-10-30T00:00:00.000Z',
      endpoint_type: 'chat',
      protocol: 'openai-chat',
      access_classification: 'free_endpoint',
      input_modalities: ['text'],
      output_modalities: ['text'],
      capabilities: {
        chat: true,
        completion: true,
        vision: false,
        audio: false,
        video: false,
        embedding: false,
        reranking: false,
        reasoning: false,
        structured_output: true,
        tool_calling: false,
      },
      pricing: {
        status: 'not_published',
      },
      provenance: {
        source_url: 'https://build.nvidia.com/nvidia/test-model',
        source_type: 'official_directory',
        observed_at: '2026-10-30T00:00:00.000Z',
        confidence: 0.9,
      },
      eligibility: {
        probe_eligible: false,
      },
    };

    const parsed = CanonicalModelSchema.safeParse(modelWithNulls);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.context_window).toBeNull();
      expect(parsed.data.pricing.input_per_million).toBeNull();
      expect(parsed.data.pricing.status).toBe('not_published');
    }
  });
});

import { z } from 'zod';

export const ModalityEnum = z.enum(['text', 'image', 'audio', 'video', 'embedding']);
export const CatalogStatusEnum = z.enum(['active', 'preview', 'deprecated', 'catalog_only', 'withdrawn']);
export const AccessClassificationEnum = z.enum(['free_endpoint', 'downloadable', 'preview', 'commercial']);
export const EndpointTypeEnum = z.enum([
  'chat',
  'completion',
  'embedding',
  'reranking',
  'visual_language',
  'audio_speech',
  'image_generation',
  'guardrail',
]);
export const EndpointProtocolEnum = z.enum(['openai-chat', 'openai-completion', 'nim-custom', 'unsupported']);
export const PricingStatusEnum = z.enum(['published', 'estimated', 'free_tier', 'not_published']);

export const ModelPricingSchema = z.object({
  currency: z.literal('USD').default('USD'),
  input_per_million: z.number().nullable().optional().default(null),
  output_per_million: z.number().nullable().optional().default(null),
  status: PricingStatusEnum,
  source: z.string().nullable().optional().default(null),
  provenance_note: z.string().optional(),
});

export const ModelCapabilitiesSchema = z.object({
  chat: z.boolean(),
  completion: z.boolean(),
  vision: z.boolean(),
  audio: z.boolean(),
  video: z.boolean(),
  embedding: z.boolean(),
  reranking: z.boolean(),
  reasoning: z.boolean(),
  structured_output: z.boolean(),
  tool_calling: z.boolean(),
});

export const ModelProvenanceSchema = z.object({
  source_url: z.string().url(),
  source_type: z.enum(['official_directory', 'ngc_api', 'm31a_registry', 'nvidia_doc']),
  observed_at: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ProbeEligibilitySchema = z.object({
  probe_eligible: z.boolean(),
  probe_endpoint: z.string().nullable().optional().default(null),
  test_messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .nullable()
    .optional()
    .default(null),
  max_probe_tokens: z.number().optional().default(4),
});

export const CanonicalModelSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, {
    message: 'Model ID must follow "publisher/model-name" format',
  }),
  name: z.string().min(1),
  publisher: z.string().min(1),
  family: z.string().nullable().optional().default(null),
  architecture: z.string().nullable().optional().default(null),
  official_detail_url: z.string().url(),
  documentation_urls: z.array(z.string().url()),
  description: z.string(),
  catalog_status: CatalogStatusEnum,
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  endpoint_type: EndpointTypeEnum,
  protocol: EndpointProtocolEnum,
  access_classification: AccessClassificationEnum,
  input_modalities: z.array(ModalityEnum).min(1),
  output_modalities: z.array(ModalityEnum).min(1),
  capabilities: ModelCapabilitiesSchema,
  context_window: z.number().int().positive().nullable().optional().default(null),
  max_output_tokens: z.number().int().positive().nullable().optional().default(null),
  pricing: ModelPricingSchema,
  license: z.string().nullable().optional().default(null),
  usage_restrictions: z.string().nullable().optional().default(null),
  provenance: ModelProvenanceSchema,
  eligibility: ProbeEligibilitySchema,
  verified_at: z.string().nullable().optional().default(null),
  deprecation_notice: z.string().nullable().optional().default(null),
});

export const RegistryIndexSchema = z.object({
  schema_version: z.string(),
  generated_at: z.string(),
  last_synced_at: z.string(),
  total_models: z.number().int().nonnegative(),
  publishers: z.array(z.string()),
  modalities: z.array(ModalityEnum),
  models: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      publisher: z.string(),
      access_classification: AccessClassificationEnum,
      endpoint_type: EndpointTypeEnum,
      context_window: z.number().nullable().optional().default(null),
      probe_eligible: z.boolean(),
      input_modalities: z.array(ModalityEnum),
      output_modalities: z.array(ModalityEnum),
      capabilities: ModelCapabilitiesSchema,
    })
  ),
});

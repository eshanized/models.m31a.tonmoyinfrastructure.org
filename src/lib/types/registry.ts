/**
 * Canonical NVIDIA Registry Types & Contracts
 * Compatible with M31A autonomous coding agent and NVIDIA Build API surfaces.
 */

export type CatalogStatus = 'active' | 'preview' | 'deprecated' | 'catalog_only' | 'withdrawn';

export type AccessClassification = 'free_endpoint' | 'downloadable' | 'preview' | 'commercial';

export type EndpointType = 
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'reranking'
  | 'visual_language'
  | 'audio_speech'
  | 'image_generation'
  | 'guardrail';

export type EndpointProtocol = 'openai-chat' | 'openai-completion' | 'nim-custom' | 'unsupported';

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'embedding';

export type PricingStatus = 'published' | 'estimated' | 'free_tier' | 'not_published';

export type ObservedHealthStatus =
  | 'operational'
  | 'degraded'
  | 'unavailable'
  | 'unknown'
  | 'stale'
  | 'catalog_only'
  | 'downloadable_only';

export interface ModelPricing {
  currency: 'USD';
  input_per_million: number | null;
  output_per_million: number | null;
  status: PricingStatus;
  source: string | null;
  provenance_note?: string;
}

export interface ModelCapabilities {
  chat: boolean | null;
  completion: boolean | null;
  vision: boolean | null;
  audio: boolean | null;
  video: boolean | null;
  embedding: boolean | null;
  reranking: boolean | null;
  reasoning: boolean | null;
  structured_output: boolean | null;
  tool_calling: boolean | null;
}

export interface ModelProvenance {
  source_url: string;
  source_type: 'official_directory' | 'ngc_api' | 'm31a_registry' | 'nvidia_doc';
  observed_at: string;
  confidence: number;
}

export interface ProbeEligibility {
  probe_eligible: boolean;
  probe_endpoint: string | null;
  test_messages?: Array<{ role: string; content: string }> | null;
  max_probe_tokens?: number;
}

export interface CanonicalModel {
  id: string; // e.g. "nvidia/nemotron-4-340b-instruct"
  name: string; // e.g. "Nemotron 4 340B Instruct"
  publisher: string; // e.g. "nvidia"
  family: string | null;
  architecture: string | null;
  official_detail_url: string;
  documentation_urls: string[];
  description: string;
  catalog_status: CatalogStatus;
  first_seen_at: string;
  last_seen_at: string;
  endpoint_type: EndpointType;
  protocol: EndpointProtocol;
  access_classification: AccessClassification;
  input_modalities: Modality[];
  output_modalities: Modality[];
  capabilities: ModelCapabilities;
  context_window: number | null;
  max_output_tokens: number | null;
  pricing: ModelPricing;
  license: string | null;
  usage_restrictions: string | null;
  provenance: ModelProvenance;
  eligibility: ProbeEligibility;
  verified_at: string | null;
  deprecation_notice?: string | null;
}

export interface RegistryIndex {
  schema_version: string;
  generated_at: string;
  last_synced_at: string;
  total_models: number;
  publishers: string[];
  modalities: Modality[];
  models: Array<{
    id: string;
    name: string;
    publisher: string;
    access_classification: AccessClassification;
    endpoint_type: EndpointType;
    context_window: number | null;
    probe_eligible: boolean;
    input_modalities: Modality[];
    output_modalities: Modality[];
    capabilities: ModelCapabilities;
  }>;
}

/**
 * Shared contract for M31A Autonomous Agent (matches ~/.config/m31a/models_cache.json)
 */
export interface M31AModelCacheEntry {
  slug: string;
  display_name: string;
  description: string;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_tools: boolean | null;
  supports_thinking: boolean | null;
  supports_vision: boolean | null;
  supports_audio: boolean | null;
  default_temperature: number;
  tool_mode: 'direct' | 'unsupported' | 'unknown';
  input_modalities: string[];
  truncation_policy: 'truncate' | 'error';
  service_tier: 'standard' | 'fast' | 'reasoning';
  multi_agent_version: number;
  auto_compact_threshold_percent: number;
  instructions_template: string | null;
  requires_auth: boolean;
  is_default: boolean;
  originator: string;
}

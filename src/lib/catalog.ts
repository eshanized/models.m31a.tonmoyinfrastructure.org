import catalogData from '../data/catalog.json';
import { CanonicalModel, RegistryIndex } from './types/registry';

export interface CatalogMetadata {
  schema_version: string;
  generated_at: string;
  last_synced_at: string;
  total_models: number;
  publishers: string[];
  modalities: string[];
}

export function getCatalogMetadata(): CatalogMetadata {
  return {
    schema_version: catalogData.schema_version,
    generated_at: catalogData.generated_at,
    last_synced_at: catalogData.last_synced_at,
    total_models: catalogData.total_models,
    publishers: catalogData.publishers,
    modalities: catalogData.modalities,
  };
}

export function getAllModels(): CanonicalModel[] {
  return catalogData.models as unknown as CanonicalModel[];
}

export function getModelById(id: string): CanonicalModel | null {
  // Normalize lookup: allow URL-safe slug or raw ID
  const decodedId = decodeURIComponent(id).replace(/--/g, '/');
  const models = getAllModels();
  return models.find((m) => m.id === decodedId || m.id.toLowerCase() === decodedId.toLowerCase()) || null;
}

export interface ModelFilterParams {
  query?: string;
  publisher?: string;
  modality?: string;
  access?: string;
  capability?: string;
  minContext?: number;
  maxContext?: number;
  priceOnly?: boolean;
  probeEligibleOnly?: boolean;
  sort?: 'name' | 'publisher' | 'context' | 'pricing' | 'status';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function queryModels(params: ModelFilterParams): PaginatedResult<CanonicalModel> {
  let list = getAllModels();

  // Search Query
  if (params.query && params.query.trim().length > 0) {
    const q = params.query.toLowerCase().trim();
    list = list.filter((m) => {
      return (
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.publisher.toLowerCase().includes(q) ||
        (m.family && m.family.toLowerCase().includes(q)) ||
        (m.architecture && m.architecture.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }

  // Publisher
  if (params.publisher && params.publisher !== 'all') {
    const pub = params.publisher.toLowerCase();
    list = list.filter((m) => m.publisher.toLowerCase() === pub);
  }

  // Modality
  if (params.modality && params.modality !== 'all') {
    list = list.filter((m) => m.input_modalities.includes(params.modality as any));
  }

  // Access Classification
  if (params.access && params.access !== 'all') {
    list = list.filter((m) => m.access_classification === params.access);
  }

  // Capability
  if (params.capability && params.capability !== 'all') {
    const cap = params.capability as keyof CanonicalModel['capabilities'];
    list = list.filter((m) => Boolean(m.capabilities[cap]));
  }

  // Context range
  if (params.minContext !== undefined && params.minContext > 0) {
    list = list.filter((m) => m.context_window !== null && m.context_window >= params.minContext!);
  }
  if (params.maxContext !== undefined && params.maxContext > 0) {
    list = list.filter((m) => m.context_window !== null && m.context_window <= params.maxContext!);
  }

  // Price published only
  if (params.priceOnly) {
    list = list.filter((m) => m.pricing.status === 'published' && m.pricing.input_per_million !== null);
  }

  // Probe eligible only
  if (params.probeEligibleOnly) {
    list = list.filter((m) => m.eligibility.probe_eligible);
  }

  // Sorting
  const sort = params.sort || 'name';
  const order = params.order || 'asc';
  const mult = order === 'desc' ? -1 : 1;

  list.sort((a, b) => {
    switch (sort) {
      case 'publisher':
        return a.publisher.localeCompare(b.publisher) * mult;
      case 'context':
        return ((a.context_window || 0) - (b.context_window || 0)) * mult;
      case 'pricing':
        return ((a.pricing.input_per_million || 0) - (b.pricing.input_per_million || 0)) * mult;
      case 'name':
      default:
        return a.name.localeCompare(b.name) * mult;
    }
  });

  const total = list.length;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const data = list.slice(offset, offset + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}

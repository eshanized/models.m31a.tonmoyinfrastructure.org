import { describe, it, expect } from 'vitest';
import { queryModels, getModelById, getAllModels } from '../src/lib/catalog';

describe('Catalog Query & Filter Engine', () => {
  it('loads canonical models cleanly', () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it('retrieves specific model by canonical ID or decoded slug', () => {
    const sample = getAllModels()[0];
    const found = getModelById(sample.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(sample.id);

    // URL safe double-dash replacement
    const doubleDash = sample.id.replace(/\//g, '--');
    const foundDoubleDash = getModelById(doubleDash);
    expect(foundDoubleDash?.id).toBe(sample.id);
  });

  it('filters models by publisher', () => {
    const res = queryModels({ publisher: 'nvidia' });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((m) => m.publisher === 'nvidia')).toBe(true);
  });

  it('filters models by modality', () => {
    const res = queryModels({ modality: 'image' });
    expect(res.data.every((m) => m.input_modalities.includes('image'))).toBe(true);
  });

  it('filters models by capability (reasoning)', () => {
    const res = queryModels({ capability: 'reasoning' });
    expect(res.data.every((m) => m.capabilities.reasoning === true)).toBe(true);
  });

  it('paginates models deterministically', () => {
    const page1 = queryModels({ page: 1, pageSize: 5 });
    const page2 = queryModels({ page: 2, pageSize: 5 });

    expect(page1.data.length).toBe(5);
    expect(page2.data.length).toBe(5);
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
    expect(page1.total).toBe(page2.total);
  });

  it('searches across model id, family, and description', () => {
    const res = queryModels({ query: 'nemotron' });
    expect(res.data.length).toBeGreaterThan(0);
    expect(
      res.data.every(
        (m) =>
          m.id.toLowerCase().includes('nemotron') ||
          m.name.toLowerCase().includes('nemotron') ||
          (m.family && m.family.toLowerCase().includes('nemotron')) ||
          m.description.toLowerCase().includes('nemotron')
      )
    ).toBe(true);
  });
});

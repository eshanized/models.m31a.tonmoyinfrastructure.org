import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { M31AModelCacheEntry } from '../src/lib/types/registry';

describe('M31A Autonomous Agent Contract Validation', () => {
  const m31aExportPath = path.resolve(process.cwd(), 'public/data/m31a-models.json');

  it('generates a valid m31a-models.json artifact conforming to M31A models_cache schema', () => {
    expect(fs.existsSync(m31aExportPath)).toBe(true);
    const content = fs.readFileSync(m31aExportPath, 'utf-8');
    const data = JSON.parse(content) as M31AModelCacheEntry[];

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Validate structure of each model candidate
    for (const model of data) {
      expect(typeof model.slug).toBe('string');
      expect(model.slug).toContain('/');
      expect(typeof model.display_name).toBe('string');
      expect(typeof model.context_window).toBe('number');
      expect(model.context_window).toBeGreaterThan(0);
      expect(typeof model.supports_tools).toBe('boolean');
      expect(typeof model.supports_thinking).toBe('boolean');
      expect(typeof model.supports_vision).toBe('boolean');
      expect(typeof model.originator).toBe('string');
      expect(['standard', 'fast', 'reasoning']).toContain(model.service_tier);
    }
  });
});

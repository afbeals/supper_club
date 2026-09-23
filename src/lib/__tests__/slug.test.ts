import { describe, expect, it } from 'vitest';
import { uniqueSlug } from '../slug';

describe('uniqueSlug', () => {
  it('slugifies the name when there is no collision', async () => {
    const slug = await uniqueSlug('Project Hail Mary', async () => false);
    expect(slug).toBe('project-hail-mary');
  });

  it('appends -2, -3, ... until it finds a free slug', async () => {
    const taken = new Set(['corner-bistro', 'corner-bistro-2']);
    const slug = await uniqueSlug('Corner Bistro', async (candidate) => taken.has(candidate));
    expect(slug).toBe('corner-bistro-3');
  });

  it('falls back to "item" for a name with no sluggable characters', async () => {
    const slug = await uniqueSlug('!!!', async () => false);
    expect(slug).toBe('item');
  });
});

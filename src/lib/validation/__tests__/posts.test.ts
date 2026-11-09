import { describe, expect, it } from 'vitest';
import { createPostSchema } from '../posts';

const baseReview = {
  status: 'DRAFT' as const,
  title: 'A review',
  productId: 1,
};

describe('createPostSchema', () => {
  it('accepts a minimal valid review and fills in defaults', () => {
    const result = createPostSchema.safeParse(baseReview);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ratings).toEqual([]);
      expect(result.data.bullets).toEqual([]);
      expect(result.data.subitems).toEqual([]);
      expect(result.data.summary).toBe('');
    }
  });

  it('rejects a review with no productId', () => {
    const { productId: _omit, ...withoutProduct } = baseReview;
    const result = createPostSchema.safeParse(withoutProduct);
    expect(result.success).toBe(false);
  });

  it('rejects a review with no title', () => {
    const { title: _omit, ...withoutTitle } = baseReview;
    const result = createPostSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });

  it('rejects a subitem rating outside 1-10', () => {
    const result = createPostSchema.safeParse({
      ...baseReview,
      subitems: [{ label: 'Chapter 1', rating: 11 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('personal rating publishing rules', () => {
  it.each([undefined, null])('allows unrated drafts (%s), but requires a rating to publish', (personalRating) => {
    expect(createPostSchema.safeParse({ ...baseReview, personalRating }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...baseReview, status: 'PUBLISHED', personalRating }).success).toBe(false);
  });
  it.each([0, 11, 3.5, '8'])('rejects invalid personal rating %s', (personalRating) => {
    expect(createPostSchema.safeParse({ ...baseReview, personalRating }).success).toBe(false);
  });
  it.each([1, 10])('accepts boundary rating %s for publication', (personalRating) => {
    expect(createPostSchema.safeParse({ ...baseReview, status: 'PUBLISHED', personalRating }).success).toBe(true);
  });
});


describe('optional experience dates', () => {
  it.each([undefined, null, '2026-11-09', '2024-02-29'])(
    'accepts an optional calendar date (%s) for drafts and published reviews', (experiencedOn) => {
      for (const status of ['DRAFT', 'PUBLISHED']) {
        const result = createPostSchema.safeParse({ ...baseReview, status, personalRating: 8, experiencedOn });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.experiencedOn).toBe(experiencedOn);
      }
    },
  );

  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '11/09/2026', '2026-11-09T00:00:00Z', '', 123])(
    'rejects an invalid or non-date-only experience value (%s)', (experiencedOn) => {
      const result = createPostSchema.safeParse({ ...baseReview, experiencedOn });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path).toEqual(['experiencedOn']);
    },
  );
});

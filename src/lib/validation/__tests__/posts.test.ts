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

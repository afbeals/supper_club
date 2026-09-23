import { describe, expect, it } from 'vitest';
import { createCommentSchema } from '../comments';

describe('createCommentSchema', () => {
  it('defaults parentId to null for a top-level comment', () => {
    const result = createCommentSchema.safeParse({ postId: 1, bodyText: 'Nice review' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBeNull();
  });

  it('accepts an explicit parentId for a reply', () => {
    const result = createCommentSchema.safeParse({ postId: 1, parentId: 4, bodyText: 'A reply' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBe(4);
  });

  it('rejects an empty bodyText', () => {
    expect(createCommentSchema.safeParse({ postId: 1, bodyText: '' }).success).toBe(false);
  });

  it('rejects bodyText over 2000 characters', () => {
    const result = createCommentSchema.safeParse({ postId: 1, bodyText: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});

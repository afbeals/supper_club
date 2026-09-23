import { describe, expect, it } from 'vitest';
import { updateProfileSchema } from '../profile';

describe('updateProfileSchema', () => {
  it('defaults bio to empty string and avatarPath to null', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe('');
      expect(result.data.avatarPath).toBeNull();
    }
  });

  it('accepts a trimmed bio and an avatarPath', () => {
    const result = updateProfileSchema.safeParse({ bio: '  Loves ramen.  ', avatarPath: 'avatars/1.jpg' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bio).toBe('Loves ramen.');
  });

  it('rejects a bio over 500 characters', () => {
    expect(updateProfileSchema.safeParse({ bio: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects an empty-string avatarPath', () => {
    expect(updateProfileSchema.safeParse({ avatarPath: '' }).success).toBe(false);
  });
});

import slugify from 'slugify';
import { prisma } from './db';

/**
 * Slugify `name`, then append `-2`, `-3`, ... until it doesn't collide with an
 * existing row. `exists` should check uniqueness scoped the same way the
 * caller's `@@unique` constraint is scoped (e.g. within one productTypeId).
 */
export async function uniqueSlug(
  name: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }) || 'item';
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function uniqueProductTypeSlug(name: string): Promise<string> {
  return uniqueSlug(name, async (candidate) => {
    const existing = await prisma.productType.findUnique({ where: { slug: candidate } });
    return existing !== null;
  });
}

export async function uniqueProductSlug(name: string): Promise<string> {
  return uniqueSlug(name, async (candidate) => {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    return existing !== null;
  });
}

export async function uniquePostSlug(name: string): Promise<string> {
  return uniqueSlug(name, async (candidate) => {
    const existing = await prisma.post.findUnique({ where: { slug: candidate } });
    return existing !== null;
  });
}

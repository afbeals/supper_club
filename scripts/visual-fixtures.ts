// Only called by the visual test server after its temporary database is seeded.
import path from 'node:path';
import { prisma } from '../src/lib/db';

const database = process.env.DATABASE_URL ?? '';
if (!database.startsWith('file:') || !path.basename(path.dirname(database.slice(5))).startsWith('supper_club-e2e-')) {
  throw new Error('Visual fixtures require the isolated browser-test database');
}

try {
  const author = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@supperclub.local' } });
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug: 'corner-bistro' }, include: { productType: { include: { criteria: true } } },
  });
  for (const [slug, experiencedOn] of [
    ['experience-date-preview', '2026-10-31'],
    ['experience-date-preview-undated', null],
  ] as const) {
    await prisma.post.create({ data: {
      slug, experiencedOn, authorId: author.id, productId: product.id,
      status: 'PUBLISHED', title: 'A lovely evening at Corner Bistro',
      summary: 'A cozy evening, memorable plates, and a reason to return.',
      bodyHtml: '<p>A relaxed dinner with thoughtful service. The seasonal menu gave us plenty to talk about.</p>',
      personalRating: 9, publishedAt: new Date('2026-11-09T12:00:00Z'),
      ratings: { create: product.productType.criteria.map((criterion) => ({ criterionId: criterion.id, value: 9 })) },
    } });
  }
} finally { await prisma.$disconnect(); }

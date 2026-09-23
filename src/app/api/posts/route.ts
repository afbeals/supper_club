import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { sanitizePostHtml } from '@/lib/sanitize';
import { uniquePostSlug } from '@/lib/slug';
import { createPostSchema } from '@/lib/validation/posts';

// Lists the signed-in user's own posts (drafts + published) for their dashboard.
export async function GET() {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const posts = await prisma.post.findMany({
    where: { authorId: guard.session.userId },
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const data = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    include: { productType: { include: { criteria: { where: { archivedAt: null } } } } },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  const validCriterionIds = new Set(product.productType.criteria.map((c) => c.id));
  for (const rating of data.ratings) {
    if (!validCriterionIds.has(rating.criterionId)) {
      return NextResponse.json({ error: 'Invalid rating criterion for this product type' }, { status: 400 });
    }
  }

  const slug = await uniquePostSlug(data.title);
  const bodyHtml = sanitizePostHtml(data.bodyHtml);
  const publishedAt = data.status === 'PUBLISHED' ? new Date() : null;

  const post = await prisma.post.create({
    data: {
      status: data.status,
      authorId: guard.session.userId,
      title: data.title,
      slug,
      summary: data.summary,
      bodyHtml,
      publishedAt,
      productId: data.productId,
      images: { create: data.images.map((img, i) => ({ ...img, sortOrder: i })) },
      ratings: { create: data.ratings.map((r) => ({ criterionId: r.criterionId, value: r.value, note: r.note })) },
      bullets: { create: data.bullets.map((b, i) => ({ kind: b.kind, text: b.text, sortOrder: i })) },
      subitems: {
        create: data.subitems.map((s, i) => ({
          label: s.label,
          notes: s.notes || null,
          rating: s.rating,
          sortOrder: i,
        })),
      },
    },
    include: { subitems: { orderBy: { sortOrder: 'asc' } } },
  });

  // PostImage.postId is a direct FK (not just via subitemId), so it's a
  // skip-level ancestor relative to the post -> subitems nesting above —
  // Prisma can't auto-fill it through that nested create. Attach subitem
  // images in a follow-up step now that the subitems (and their ids) exist.
  // post.subitems is ordered by sortOrder ascending, matching data.subitems'
  // array order (sortOrder was assigned as the array index above).
  for (let i = 0; i < data.subitems.length; i++) {
    const subitem = data.subitems[i];
    const createdSubitem = post.subitems[i];
    if (subitem && createdSubitem && subitem.images.length > 0) {
      await prisma.postImage.createMany({
        data: subitem.images.map((img, j) => ({ ...img, postId: post.id, subitemId: createdSubitem.id, sortOrder: j })),
      });
    }
  }

  return NextResponse.json({ post }, { status: 201 });
}

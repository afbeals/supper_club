import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { sanitizePostHtml } from '@/lib/sanitize';
import { createPostSchema } from '@/lib/validation/posts';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      ratings: true,
      bullets: { orderBy: { sortOrder: 'asc' } },
      images: { where: { subitemId: null }, orderBy: { sortOrder: 'asc' } },
      subitems: { orderBy: { sortOrder: 'asc' }, include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  if (!post || post.authorId !== guard.session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing || existing.authorId !== guard.session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

  const bodyHtml = sanitizePostHtml(data.bodyHtml);
  const publishedAt = data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null;

  const post = await prisma.$transaction(async (tx) => {
    // Full replace: simplest correct approach for a POC-scale editor — delete
    // and recreate child rows rather than diffing arrays against existing ids.
    // Order matters: images by postId covers both post-level and subitem-level
    // rows before subitems themselves are removed.
    await tx.rating.deleteMany({ where: { postId } });
    await tx.postBullet.deleteMany({ where: { postId } });
    await tx.postImage.deleteMany({ where: { postId } });
    await tx.subitem.deleteMany({ where: { postId } });

    return tx.post.update({
      where: { id: postId },
      data: {
        title: data.title,
        summary: data.summary,
        bodyHtml,
        status: data.status,
        publishedAt,
        images: { create: data.images.map((img, i) => ({ ...img, sortOrder: i })) },
        productId: data.productId,
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
  });

  // See the POST handler for why subitem images can't nest under this same
  // create: PostImage.postId is a direct FK, a skip-level ancestor relative
  // to post -> subitems, so it needs the subitem ids this call just created.
  for (let i = 0; i < data.subitems.length; i++) {
    const subitem = data.subitems[i];
    const createdSubitem = post.subitems[i];
    if (subitem && createdSubitem && subitem.images.length > 0) {
      await prisma.postImage.createMany({
        data: subitem.images.map((img, j) => ({ ...img, postId: post.id, subitemId: createdSubitem.id, sortOrder: j })),
      });
    }
  }

  return NextResponse.json({ post });
}

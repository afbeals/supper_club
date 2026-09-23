import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { setPostStatusSchema } from '@/lib/validation/posts';

// Lightweight status toggle for the dashboard list — publish or unpublish
// without loading the full editor. Full edits go through PATCH /api/posts/[id].
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setPostStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing || existing.authorId !== guard.session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: parsed.data.status,
      publishedAt: parsed.data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null,
    },
  });

  return NextResponse.json({ post });
}

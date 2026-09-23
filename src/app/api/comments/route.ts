import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { createCommentSchema } from '@/lib/validation/comments';

// Comments are plain text, stored and rendered as text — never HTML — so no
// sanitize-html pass is needed here (see plan security notes).
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id: parsed.data.postId } });
  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.postId !== parsed.data.postId || parent.deletedAt) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId: parsed.data.postId,
      parentId: parsed.data.parentId,
      authorId: guard.session.userId,
      bodyText: parsed.data.bodyText,
    },
    // select, not include: true — never return passwordHash in an API response.
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

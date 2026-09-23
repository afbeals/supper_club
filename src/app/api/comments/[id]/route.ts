import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';

// Soft delete (deletedAt) rather than a hard delete, so a reply thread under
// a removed comment doesn't orphan — see the post detail page's query, which
// filters deletedAt out of what it renders.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const { id } = await params;
  const commentId = Number(id);
  if (!Number.isInteger(commentId)) {
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (comment.authorId !== guard.session.userId && guard.session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });

  return NextResponse.json({ success: true });
}

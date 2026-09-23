import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';

const patchSchema = z.object({
  archived: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const criterionId = Number(id);
  if (!Number.isInteger(criterionId)) {
    return NextResponse.json({ error: 'Invalid criterion id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const criterion = await prisma.ratingCriterion.update({
    where: { id: criterionId },
    data: { archivedAt: parsed.data.archived ? new Date() : null },
  });

  return NextResponse.json({ criterion });
}

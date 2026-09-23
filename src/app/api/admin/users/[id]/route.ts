import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { updateUserSchema } from '@/lib/validation/admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (userId === guard.session.userId) {
    const wouldDeactivate = parsed.data.active === false;
    const wouldDemote = parsed.data.role === 'WRITER';
    if (wouldDeactivate || wouldDemote) {
      return NextResponse.json({ error: "You can't deactivate or demote your own account" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user });
}

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { updateProfileSchema } from '@/lib/validation/profile';

export async function PATCH(request: NextRequest) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: guard.session.userId },
    data: { bio: parsed.data.bio, avatarPath: parsed.data.avatarPath },
    select: { id: true, name: true, bio: true, avatarPath: true },
  });

  return NextResponse.json({ user });
}

import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validation/auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Same generic message whether the email doesn't exist, the account is
  // deactivated, or the password is wrong — don't leak which one it was.
  if (!user || !user.active || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

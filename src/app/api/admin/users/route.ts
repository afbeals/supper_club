import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { createUserSchema } from '@/lib/validation/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: bcrypt.hashSync(parsed.data.password, 12),
    },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { uniqueProductTypeSlug } from '@/lib/slug';
import { createProductTypeSchema } from '@/lib/validation/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const productTypes = await prisma.productType.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { criteria: { orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json({ productTypes });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createProductTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const existingByName = await prisma.productType.findUnique({ where: { name: parsed.data.name } });
  if (existingByName) {
    return NextResponse.json({ error: 'A product type with this name already exists' }, { status: 409 });
  }

  const slug = await uniqueProductTypeSlug(parsed.data.name);
  const productType = await prisma.productType.create({
    data: { name: parsed.data.name, description: parsed.data.description, slug },
    include: { criteria: true },
  });

  return NextResponse.json({ productType }, { status: 201 });
}

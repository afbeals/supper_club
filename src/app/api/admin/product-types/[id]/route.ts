import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { updateProductTypeSchema } from '@/lib/validation/admin';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const productTypeId = Number(id);
  if (!Number.isInteger(productTypeId) || productTypeId <= 0) {
    return NextResponse.json({ error: 'Invalid product type id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProductTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const productType = await prisma.productType.update({
      where: { id: productTypeId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.archived !== undefined ? { archivedAt: parsed.data.archived ? new Date() : null } : {}),
      },
    });
    return NextResponse.json({ productType });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return NextResponse.json({ error: 'A product type with this name already exists' }, { status: 409 });
      if (error.code === 'P2025') return NextResponse.json({ error: 'Product type not found' }, { status: 404 });
    }
    throw error;
  }
}

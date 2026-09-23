import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { createCriterionSchema } from '@/lib/validation/admin';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const productTypeId = Number(id);
  if (!Number.isInteger(productTypeId)) {
    return NextResponse.json({ error: 'Invalid product type id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCriterionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  if (parsed.data.minValue >= parsed.data.maxValue) {
    return NextResponse.json({ error: 'minValue must be less than maxValue' }, { status: 400 });
  }

  const productType = await prisma.productType.findUnique({ where: { id: productTypeId } });
  if (!productType) {
    return NextResponse.json({ error: 'Product type not found' }, { status: 404 });
  }

  const existing = await prisma.ratingCriterion.findUnique({
    where: { productTypeId_name: { productTypeId, name: parsed.data.name } },
  });
  if (existing) {
    return NextResponse.json({ error: 'A criterion with this name already exists on this product type' }, { status: 409 });
  }

  const maxSortOrder = await prisma.ratingCriterion.aggregate({
    where: { productTypeId },
    _max: { sortOrder: true },
  });

  const criterion = await prisma.ratingCriterion.create({
    data: {
      productTypeId,
      name: parsed.data.name,
      description: parsed.data.description,
      minValue: parsed.data.minValue,
      maxValue: parsed.data.maxValue,
      higherIsBetter: parsed.data.higherIsBetter,
      weight: parsed.data.weight,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ criterion }, { status: 201 });
}

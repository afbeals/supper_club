import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { prisma } from '@/lib/db';
import { uniqueProductSlug } from '@/lib/slug';
import { createProductSchema } from '@/lib/validation/admin';

// Any signed-in writer can create a product (they need one to review) —
// only product-type/criteria configuration is admin-only. Public browsing of
// products (the (site) routes) queries Prisma directly in server components
// rather than this endpoint, which exists for the signed-in authoring flow.
// Returns products alongside active product types in one round trip — the
// authoring form needs both: products (with their type's active criteria, to
// render rating sliders) for the picker, and product types for "add new
// product" without a second request.
export async function GET() {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const [products, productTypes] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        productType: {
          include: { criteria: { where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    }),
    prisma.productType.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } }),
  ]);

  return NextResponse.json({ products, productTypes });
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const productType = await prisma.productType.findUnique({ where: { id: parsed.data.productTypeId } });
  if (!productType || productType.archivedAt) {
    return NextResponse.json({ error: 'Product type not found' }, { status: 404 });
  }

  const existing = await prisma.product.findUnique({
    where: { productTypeId_name: { productTypeId: parsed.data.productTypeId, name: parsed.data.name } },
  });
  if (existing) {
    return NextResponse.json({ error: 'A product with this name already exists for this type' }, { status: 409 });
  }

  const slug = await uniqueProductSlug(parsed.data.name);
  const product = await prisma.product.create({
    data: {
      productTypeId: parsed.data.productTypeId,
      name: parsed.data.name,
      slug,
      subtitle: parsed.data.subtitle,
      url: parsed.data.url,
      description: parsed.data.description,
      createdById: guard.session.userId,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}

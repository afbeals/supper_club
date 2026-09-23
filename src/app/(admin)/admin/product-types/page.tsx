import { prisma } from '@/lib/db';
import { ProductTypesManager } from './ProductTypesManager';

export default async function ProductTypesPage() {
  const productTypes = await prisma.productType.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { criteria: { orderBy: { sortOrder: 'asc' } } },
  });

  return <ProductTypesManager initialProductTypes={productTypes} />;
}

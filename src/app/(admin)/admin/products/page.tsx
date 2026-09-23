import { prisma } from '@/lib/db';
import { ProductsManager } from './ProductsManager';

export default async function ProductsPage() {
  const [products, productTypes] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { productType: true },
    }),
    prisma.productType.findMany({
      where: { archivedAt: null },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return <ProductsManager initialProducts={products} productTypes={productTypes} />;
}

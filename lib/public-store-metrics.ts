import type { Prisma, PrismaClient } from "@prisma/client";
import { VALID_STAR_ORDER_STATUSES } from "./star-products";

export interface StoreShowcaseMetrics {
  previewImages: string[];
  categories: string[];
  minPrice: number | null;
  totalSold: number;
  averageRating: number | null;
  reviewCount: number;
  activeProductCount: number;
}

export interface StoreProductMetric {
  categoryName: string | null;
  soldCount: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface StoreDetailMetrics {
  byProductId: Record<string, StoreProductMetric>;
  categories: Array<{ name: string; count: number }>;
  totalSold: number;
  averageRating: number | null;
  reviewCount: number;
  minPrice: number | null;
  starProductId: string | null;
}

export type StoreMetricsDb = Pick<
  PrismaClient | Prisma.TransactionClient,
  "product" | "orderItem" | "review"
>;

/**
 * Mengambil metrik etalase seluruh toko florist untuk direktori /stores tanpa mengubah lib/public-store.ts.
 */
export async function getPublicStoreShowcaseData(
  db: StoreMetricsDb,
  storeIds: string[],
): Promise<Record<string, StoreShowcaseMetrics>> {
  if (storeIds.length === 0) return {};

  const products = await db.product.findMany({
    where: {
      floristId: { in: storeIds },
      isActive: true,
    },
    select: {
      id: true,
      floristId: true,
      image: true,
      price: true,
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allProductIds = products.map((p) => p.id);

  const [salesRows, reviewRows] =
    allProductIds.length > 0
      ? await Promise.all([
          db.orderItem.groupBy({
            by: ["productId"],
            where: {
              productId: { in: allProductIds },
              order: { status: { in: [...VALID_STAR_ORDER_STATUSES] } },
            },
            _sum: { quantity: true },
          }),
          db.review.groupBy({
            by: ["productId"],
            where: { productId: { in: allProductIds } },
            _avg: { rating: true },
            _count: { _all: true },
          }),
        ])
      : [[], []];

  const soldByProduct = new Map(
    salesRows.map((row) => [row.productId, row._sum.quantity ?? 0]),
  );
  const reviewByProduct = new Map(
    reviewRows.map((row) => [
      row.productId,
      {
        avg: row._avg.rating ?? 0,
        count: row._count._all ?? 0,
      },
    ]),
  );

  const productsByStore = new Map<string, typeof products>();
  for (const product of products) {
    const list = productsByStore.get(product.floristId);
    if (list) {
      list.push(product);
    } else {
      productsByStore.set(product.floristId, [product]);
    }
  }

  const result: Record<string, StoreShowcaseMetrics> = {};

  for (const storeId of storeIds) {
    const storeProducts = productsByStore.get(storeId) ?? [];
    const orderedForPreview = storeProducts.toSorted(
      (a, b) => (soldByProduct.get(b.id) ?? 0) - (soldByProduct.get(a.id) ?? 0),
    );

    const previewImages: string[] = [];
    for (const prod of orderedForPreview) {
      const img = prod.image?.trim();
      if (img && !previewImages.includes(img)) {
        previewImages.push(img);
        if (previewImages.length >= 3) break;
      }
    }

    const categories: string[] = [];
    let minPrice: number | null = null;
    let totalSold = 0;
    let ratingSum = 0;
    let reviewCount = 0;

    for (const prod of storeProducts) {
      const catName = prod.category?.name?.trim();
      if (catName && !categories.includes(catName) && categories.length < 3) {
        categories.push(catName);
      }

      if (minPrice === null || prod.price < minPrice) {
        minPrice = prod.price;
      }

      totalSold += soldByProduct.get(prod.id) ?? 0;

      const rev = reviewByProduct.get(prod.id);
      if (rev && rev.count > 0) {
        ratingSum += rev.avg * rev.count;
        reviewCount += rev.count;
      }
    }

    result[storeId] = {
      previewImages,
      categories,
      minPrice,
      totalSold,
      averageRating:
        reviewCount > 0 ? Number((ratingSum / reviewCount).toFixed(1)) : null,
      reviewCount,
      activeProductCount: storeProducts.length,
    };
  }

  return result;
}

/**
 * Mengambil metrik detail produk untuk halaman publik toko spesifik /stores/[id].
 */
export async function getStoreDetailMetrics(
  db: StoreMetricsDb,
  productIds: string[],
): Promise<StoreDetailMetrics> {
  if (productIds.length === 0) {
    return {
      byProductId: {},
      categories: [],
      totalSold: 0,
      averageRating: null,
      reviewCount: 0,
      minPrice: null,
      starProductId: null,
    };
  }

  const [products, salesRows, reviewRows] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        price: true,
        category: { select: { name: true } },
      },
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: { status: { in: [...VALID_STAR_ORDER_STATUSES] } },
      },
      _sum: { quantity: true },
    }),
    db.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const soldByProduct = new Map(
    salesRows.map((row) => [row.productId, row._sum.quantity ?? 0]),
  );
  const reviewByProduct = new Map(
    reviewRows.map((row) => [
      row.productId,
      {
        avg: row._avg.rating ?? 0,
        count: row._count._all ?? 0,
      },
    ]),
  );

  const byProductId: Record<string, StoreProductMetric> = {};
  const categoryCountMap = new Map<string, number>();

  let totalSold = 0;
  let ratingSum = 0;
  let reviewCount = 0;
  let minPrice: number | null = null;
  let starProductId: string | null = null;
  let topSold = 0;
  let topReviews = -1;
  let topAvg = -1;

  for (const prod of products) {
    const categoryName = prod.category?.name?.trim() || null;
    if (categoryName) {
      categoryCountMap.set(
        categoryName,
        (categoryCountMap.get(categoryName) ?? 0) + 1,
      );
    }

    if (minPrice === null || prod.price < minPrice) {
      minPrice = prod.price;
    }

    const soldCount = soldByProduct.get(prod.id) ?? 0;
    totalSold += soldCount;

    const rev = reviewByProduct.get(prod.id);
    const prodReviewCount = rev?.count ?? 0;
    const prodAvg =
      rev && rev.count > 0 ? Number(rev.avg.toFixed(1)) : null;

    if (rev && rev.count > 0) {
      ratingSum += rev.avg * rev.count;
      reviewCount += rev.count;
    }

    byProductId[prod.id] = {
      categoryName,
      soldCount,
      averageRating: prodAvg,
      reviewCount: prodReviewCount,
    };

    if (
      soldCount > 0 &&
      (soldCount > topSold ||
        (soldCount === topSold &&
          (prodReviewCount > topReviews ||
            (prodReviewCount === topReviews && (prodAvg ?? 0) > topAvg))))
    ) {
      topSold = soldCount;
      topReviews = prodReviewCount;
      topAvg = prodAvg ?? 0;
      starProductId = prod.id;
    }
  }

  const categories = Array.from(categoryCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    byProductId,
    categories,
    totalSold,
    averageRating:
      reviewCount > 0 ? Number((ratingSum / reviewCount).toFixed(1)) : null,
    reviewCount,
    minPrice,
    starProductId,
  };
}

import type { OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import type { Product } from "@/types";

export const VALID_STAR_ORDER_STATUSES: readonly OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
] as const;

export type StarProductsMode = "best-selling" | "featured-fallback";

export type StarProductsDb = Pick<
  PrismaClient | Prisma.TransactionClient,
  "orderItem" | "product" | "review"
>;

const PRODUCT_STAR_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  florist: {
    select: {
      id: true,
      name: true,
      floristProfile: {
        select: {
          shopName: true,
          logo: true,
          defaultAddress: {
            select: {
              city: true,
              province: true,
            },
          },
        },
      },
    },
  },
} as const;

type ProductStarRow = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_STAR_INCLUDE;
}>;

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 5;
  return Math.max(1, Math.min(12, Math.trunc(limit)));
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function buildRatingMap(db: StarProductsDb, productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, { averageRating?: number; reviewCount?: number }>();
  }
  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [
      row.productId,
      {
        averageRating:
          row._avg.rating !== null && row._count._all > 0
            ? Number(row._avg.rating.toFixed(1))
            : undefined,
        reviewCount: row._count._all > 0 ? row._count._all : undefined,
      },
    ]),
  );
}

function serializeProduct(
  row: ProductStarRow,
  stats: {
    soldCount: number;
    orderCount: number;
    averageRating?: number;
    reviewCount?: number;
  },
): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    stock: row.stock,
    image: row.image,
    images: row.images ?? [],
    categoryId: row.categoryId,
    floristId: row.floristId,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    tags: row.tags ?? [],
    weight: row.weight ?? null,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    averageRating: stats.averageRating,
    reviewCount: stats.reviewCount,
    soldCount: stats.soldCount,
    orderCount: stats.orderCount,
    category: row.category,
    florist: row.florist,
  };
}

/**
 * Mengambil produk bintang (paling sering dibeli dari seluruh florist aktif).
 * Jika belum ada pembelian valid di database, fallback ke produk aktif unggulan tanpa merekayasa angka penjualan.
 */
export async function getStarProducts(
  db: StarProductsDb,
  options?: { limit?: number },
): Promise<{ products: Product[]; mode: StarProductsMode }> {
  const limit = clampLimit(options?.limit);

  const groupedSales = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        status: { in: [...VALID_STAR_ORDER_STATUSES] },
      },
      product: {
        isActive: true,
        florist: { isActive: true },
      },
    },
    _sum: { quantity: true },
    _count: { _all: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit * 2,
  });

  const rankedSales = groupedSales
    .filter((row) => (row._sum.quantity ?? 0) > 0)
    .toSorted(
      (a, b) =>
        (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0) ||
        (b._count._all ?? 0) - (a._count._all ?? 0),
    )
    .slice(0, limit);

  if (rankedSales.length > 0) {
    const rankedIds = rankedSales.map((row) => row.productId);
    const saleMap = new Map(
      rankedSales.map((row) => [
        row.productId,
        {
          soldCount: row._sum.quantity ?? 0,
          orderCount: row._count._all ?? 0,
        },
      ]),
    );

    const rows = await db.product.findMany({
      where: {
        id: { in: rankedIds },
        isActive: true,
        florist: { isActive: true },
      },
      include: PRODUCT_STAR_INCLUDE,
    });

    const ratingMap = await buildRatingMap(
      db,
      rows.map((r) => r.id),
    );

    const products = rows
      .map((row) => {
        const sale = saleMap.get(row.id) ?? { soldCount: 0, orderCount: 0 };
        const rating = ratingMap.get(row.id) ?? {};
        return serializeProduct(row, {
          soldCount: sale.soldCount,
          orderCount: sale.orderCount,
          averageRating: rating.averageRating,
          reviewCount: rating.reviewCount,
        });
      })
      .toSorted(
        (a, b) =>
          (b.soldCount ?? 0) - (a.soldCount ?? 0) ||
          (b.orderCount ?? 0) - (a.orderCount ?? 0) ||
          (b.averageRating ?? 0) - (a.averageRating ?? 0),
      );

    if (products.length > 0) {
      return { products, mode: "best-selling" };
    }
  }

  const fallbackRows = await db.product.findMany({
    where: {
      isActive: true,
      florist: { isActive: true },
    },
    include: PRODUCT_STAR_INCLUDE,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const fallbackRatingMap = await buildRatingMap(
    db,
    fallbackRows.map((r) => r.id),
  );

  const products = fallbackRows.map((row) => {
    const rating = fallbackRatingMap.get(row.id) ?? {};
    return serializeProduct(row, {
      soldCount: 0,
      orderCount: 0,
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
    });
  });

  return { products, mode: "featured-fallback" };
}

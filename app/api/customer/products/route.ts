import prisma from "@/lib/prisma";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/config/domain";
import { VALID_STAR_ORDER_STATUSES } from "@/lib/star-products";
import { NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";

const PRODUCT_CATALOG_INCLUDE = {
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

// Handler HTTP GET untuk mengambil katalog produk pelanggan dengan filter kategori, pencarian, ketersediaan, rating, dan pengurutan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId =
      searchParams.get("categoryId") || searchParams.get("categiryId");
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const inStock = searchParams.get("inStock");
    const sortBy = searchParams.get("sortBy") || "newest";
    const { page, limit, skip } = parsePaginationParams(searchParams, 50, 100);

    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
      florist: { isActive: true },
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (inStock === "true") {
      whereClause.stock = { gt: 0 };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
    }

    if (minRating && minRating !== "all") {
      const minRatingNum = Number.parseFloat(minRating);
      if (!Number.isNaN(minRatingNum)) {
        whereClause.reviews = {
          some: {
            rating: {
              gte: minRatingNum,
            },
          },
        };
      }
    }

    const validStatuses: OrderStatus[] = [...VALID_STAR_ORDER_STATUSES];
    type CatalogProductRow = Prisma.ProductGetPayload<{
      include: typeof PRODUCT_CATALOG_INCLUDE;
    }>;
    let products: CatalogProductRow[];
    let total = 0;
    const precomputedSalesMap = new Map<
      string,
      { soldCount: number; orderCount: number }
    >();

    if (sortBy === "best-selling") {
      const matchingRows = await prisma.product.findMany({
        where: whereClause,
        select: { id: true, createdAt: true },
      });
      total = matchingRows.length;

      if (matchingRows.length > 0) {
        const salesRows = await prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: matchingRows.map((row) => row.id) },
            order: { status: { in: validStatuses } },
          },
          _sum: { quantity: true },
          _count: { _all: true },
        });

        for (const row of salesRows) {
          precomputedSalesMap.set(row.productId, {
            soldCount: row._sum.quantity ?? 0,
            orderCount: row._count._all ?? 0,
          });
        }

        const pageRows = matchingRows
          .toSorted((a, b) => {
            const aSale = precomputedSalesMap.get(a.id);
            const bSale = precomputedSalesMap.get(b.id);
            return (
              (bSale?.soldCount ?? 0) - (aSale?.soldCount ?? 0) ||
              (bSale?.orderCount ?? 0) - (aSale?.orderCount ?? 0) ||
              b.createdAt.getTime() - a.createdAt.getTime()
            );
          })
          .slice(skip, skip + limit);

        const pageIds = pageRows.map((row) => row.id);
        const unordered =
          pageIds.length > 0
            ? await prisma.product.findMany({
                where: { id: { in: pageIds } },
                include: PRODUCT_CATALOG_INCLUDE,
              })
            : [];
        const byId = new Map(unordered.map((item) => [item.id, item]));
        products = pageIds
          .map((id) => byId.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
      } else {
        products = [];
      }
    } else {
      let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
      switch (sortBy) {
        case "price-asc":
          orderBy = { price: "asc" };
          break;
        case "price-desc":
          orderBy = { price: "desc" };
          break;
        case "name-asc":
          orderBy = { name: "asc" };
          break;
        case "name-desc":
          orderBy = { name: "desc" };
          break;
        case "newest":
        default:
          orderBy = { createdAt: "desc" };
          break;
      }

      const [foundProducts, countTotal] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          include: PRODUCT_CATALOG_INCLUDE,
          orderBy,
          take: limit,
          skip,
        }),
        prisma.product.count({ where: whereClause }),
      ]);
      products = foundProducts;
      total = countTotal;
    }

    const pageProductIds = products.map((p) => p.id);

    const [reviewAggregations, salesAggregations] =
      pageProductIds.length > 0
        ? await Promise.all([
            prisma.review.groupBy({
              by: ["productId"],
              where: {
                productId: { in: pageProductIds },
              },
              _avg: { rating: true },
              _count: { _all: true },
            }),
            sortBy === "best-selling"
              ? Promise.resolve([])
              : prisma.orderItem.groupBy({
                  by: ["productId"],
                  where: {
                    productId: { in: pageProductIds },
                    order: { status: { in: validStatuses } },
                  },
                  _sum: { quantity: true },
                  _count: { _all: true },
                }),
          ])
        : [[], []];

    const ratingMap = new Map(
      reviewAggregations.map((row) => [
        row.productId,
        {
          averageRating: row._avg.rating ?? 0,
          reviewCount: row._count._all,
        },
      ]),
    );

    if (sortBy !== "best-selling") {
      for (const row of salesAggregations) {
        precomputedSalesMap.set(row.productId, {
          soldCount: row._sum.quantity ?? 0,
          orderCount: row._count._all ?? 0,
        });
      }
    }

    const productsWithMeta = products.map((product) => {
      const rating = ratingMap.get(product.id);
      const sales = precomputedSalesMap.get(product.id);
      return {
        ...product,
        averageRating:
          rating && rating.averageRating > 0
            ? Number(rating.averageRating.toFixed(1))
            : undefined,
        reviewCount:
          rating && rating.reviewCount > 0 ? rating.reviewCount : undefined,
        soldCount:
          sales && sales.soldCount > 0 ? sales.soldCount : undefined,
        orderCount:
          sales && sales.orderCount > 0 ? sales.orderCount : undefined,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil diambil",
        data: {
          items: productsWithMeta,
          pagination: buildPaginationMeta(page, limit, total),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data produk",
      },
      { status: 500 },
    );
  }
}

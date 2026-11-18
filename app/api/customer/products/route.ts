import prisma from "@/lib/prisma";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/config/domain";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

// Handler HTTP GET untuk mengambil katalog produk pelanggan dengan filter kategori, pencarian, rating, dan pengurutan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId =
      searchParams.get("categoryId") || searchParams.get("categiryId");
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "newest";
    const { page, limit, skip } = parsePaginationParams(searchParams, 50, 100);

    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
      florist: { isActive: true },
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
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
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    const reviewAggregations =
      products.length > 0
        ? await prisma.review.groupBy({
            by: ["productId"],
            where: {
              productId: { in: products.map((p) => p.id) },
            },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : [];

    const ratingMap = new Map(
      reviewAggregations.map((row) => [
        row.productId,
        {
          averageRating: row._avg.rating ?? 0,
          reviewCount: row._count._all,
        },
      ]),
    );

    const productsWithRatings = products.map((product) => {
      const stats = ratingMap.get(product.id);
      return {
        ...product,
        averageRating:
          stats && stats.averageRating > 0 ? stats.averageRating : undefined,
        reviewCount:
          stats && stats.reviewCount > 0 ? stats.reviewCount : undefined,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil diambil",
        data: {
          items: productsWithRatings,
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

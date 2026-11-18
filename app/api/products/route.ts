import prisma from "@/lib/prisma";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/config/domain";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET publik untuk mengambil daftar produk atau detail produk berdasarkan slug
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const product = await prisma.product.findFirst({
        where: {
          slug,
          isActive: true,
          florist: { isActive: true },
        },
        include: {
          category: true,
          florist: {
            select: {
              id: true,
              name: true,
              floristProfile: {
                select: {
                  shopName: true,
                  defaultAddress: { select: { city: true } },
                },
              },
            },
          },
        },
      });

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: "Produk tidak ditemukan",
          },
          { status: 404 },
        );
      }

      const reviewStats = await prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const totalReviews = reviewStats._count._all;
      const averageRating =
        totalReviews > 0 && reviewStats._avg.rating !== null
          ? Number(reviewStats._avg.rating.toFixed(1))
          : 0;

      const formattedProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image: product.image,
        images: product.images || [],
        tags: product.tags || [],
        categoryId: product.categoryId,
        floristId: product.floristId,
        createdAt: product.createdAt.toISOString(),
        florist: {
          id: product.florist.id,
          shopName:
            product.florist.floristProfile?.shopName || product.florist.name,
          city: product.florist.floristProfile?.defaultAddress?.city || "",
        },
        category: {
          id: product.category?.id || "",
          name: product.category?.name || "Umum",
        },
        averageRating,
        totalReviews,
      };

      return NextResponse.json({
        success: true,
        data: formattedProduct,
      });
    }

    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const { page, limit, skip } = parsePaginationParams(searchParams, 20, 100);

    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
      florist: { isActive: true },
    };
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          florist: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Daftar produk berhasil diambil",
      data: {
        products,
        pagination: buildPaginationMeta(page, limit, total),
      },
    });
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

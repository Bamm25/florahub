import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

// GET: Fetch products dengan filter category, search, rating dan sorting
export async function GET(request: Request) {
  try {
    // Parse query parameters untuk filtering dan pagination
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || searchParams.get("categiryId"); // Support both spellings
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause dengan active products only
    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Apply category filter jika ada
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Apply search filter untuk name, description, dan tags
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
    }

    // Apply rating filter menggunakan review aggregation
    if (minRating && minRating !== "all") {
      const minRatingNum = parseFloat(minRating);
      if (!isNaN(minRatingNum)) {
        whereClause.reviews = {
          some: {
            rating: {
              gte: minRatingNum,
            },
          },
        };
      }
    }

    // Determine sort order berdasarkan sortBy parameter
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

    // Query products dengan category, florist, dan reviews
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
              phone: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: skip,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Calculate average rating dan review count untuk setiap product
    const productsWithRatings = products.map((product) => {
      const reviews = product.reviews;
      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

      const { reviews: _, ...productData } = product;
      return {
        ...productData,
        averageRating: averageRating > 0 ? averageRating : undefined,
        reviewCount: reviewCount > 0 ? reviewCount : undefined,
      };
    });

    // Return response dengan products dan pagination metadata
    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil diambil",
        data: {
          items: productsWithRatings,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
        // Handle errors dan return generic error response
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

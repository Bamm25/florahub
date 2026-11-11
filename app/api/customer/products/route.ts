import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

// Handler HTTP GET untuk mengambil katalog produk pelanggan dengan filter kategori, pencarian, rating, dan pengurutan
export async function GET(request: Request) {
  try {
    // Urai parameter query untuk penyaringan dan penomoran halaman
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || searchParams.get("categiryId"); // Dukung kedua variasi penulisan
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Susun klausa filter hanya untuk produk yang berstatus aktif
    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Terapkan penyaringan berdasarkan kategori produk jika tersedia
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Terapkan penyaringan kata kunci pencarian pada nama, deskripsi, dan tag
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
    }

    // Terapkan batas minimum rating ulasan produk
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

    // Tentukan urutan pengurutan data berdasarkan parameter sortBy
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

    // Ambil data produk beserta relasi kategori, florist, dan ulasan secara paralel
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

    // Hitung rating rata-rata dan total ulasan untuk masing-masing produk
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

    // Kirim respons berhasil beserta data produk dan metadata paginasi
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
    // Tangani galat dan kembalikan respons kesalahan server
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

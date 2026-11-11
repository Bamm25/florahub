import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createProductSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar produk atau detail produk berdasarkan slug
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    // Ambil detail produk spesifik jika parameter slug disertakan
    if (slug) {
      const product = await prisma.product.findFirst({
        where: {
          slug: slug,
          isActive: true,
        },
        include: {
          category: true,
          florist: {
            select: {
              id: true,
              name: true,
              email: true,
              floristProfile: {
                select: {
                  shopName: true,
                  defaultAddress: { select: { city: true } },
                },
              },
            },
          },
          reviews: {
            select: {
              rating: true,
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

      // Hitung agregasi ulasan dan rating rata-rata produk
      const totalReviews = product.reviews.length;
      const averageRating =
        totalReviews > 0
          ? Number(
              (
                product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                totalReviews
              ).toFixed(1),
            )
          : 0;

      // Format data produk untuk kebutuhan respons
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
          shopName: product.florist.floristProfile?.shopName || product.florist.name,
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Susun klausa filter pencarian dan kategori produk
    const whereClause: any = {
      isActive: true,
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

    // Ambil daftar produk dan hitung total data secara paralel
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          florist: {
            select: {
              id: true,
              name: true,
              email: true,
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
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
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
      {
        status: 500,
      },
    );
  }
}

// Handler HTTP POST untuk menambahkan produk baru
export async function POST(request: Request) {
  try {
    // Validasi otentikasi peran florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    try {
      // Parse dan validasi payload pembuatan produk
      const body = await request.json();
      const validatedData = createProductSchema.parse(body);
      const { name, description, price, stock, image, categoryId } =
        validatedData;

      // Simpan produk baru ke database
      const newProduct = await prisma.product.create({
        data: {
          name: name.trim(),
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          description: description?.trim() || "",
          price: price,
          stock: stock || 0,
          image: image?.trim() || "",
          categoryId: categoryId,
          floristId: userId,
          isActive: true,
        },
        include: {
          category: true,
          florist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Kirim respons berhasil pembuatan produk
      return NextResponse.json(
        {
          success: true,
          message: "Produk berhasil dibuat",
          data: newProduct,
        },
        { status: 201 },
      );
    } catch (error) {
      // Tangani error validasi skema pembuatan produk
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat produk",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createReviewSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute ulasan produk
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk mengambil daftar ulasan produk beserta agregasi rating
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Pastikan produk yang akan diambil ulasannya ditemukan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Ambil ulasan produk dengan pagination dan hitung total ulasan
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: skip,
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    // Hitung rata-rata rating dari seluruh ulasan produk
    let averageRating = 0;
    if (total > 0) {
      const allReviews = await prisma.review.findMany({
        where: { productId },
        select: { rating: true },
      });
      const sumRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
      averageRating = Number((sumRating / total).toFixed(1));
    }

    return NextResponse.json({
      success: true,
      message: "Daftar ulasan produk berhasil diambil",
      data: {
        product: {
          id: product.id,
          name: product.name,
        },
        stats: {
          totalReview: total,
          averageRating,
        },
        items: reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan ulasan baru pada produk
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: productId } = await params;

    // Pastikan produk tersedia di basis data
    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);
    const { rating, comment, images } = validatedData;

    // Pastikan pelanggan sudah membeli dan menerima produk tersebut
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: { in: ["DELIVERED"] },
        },
        productId,
      },
    });

    if (!hasPurchased) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda harus membeli dan menerima produk ini untuk memberikan ulasan",
        },
        { status: 403 },
      );
    }

    // Periksa apakah pelanggan sudah pernah memberikan ulasan pada produk ini
    const existingReview = await prisma.review.findFirst({
      where: {
        productId,
        userId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda sudah memberikan ulasan untuk produk ini. Silakan edit ulasan yang sudah ada.",
        },
        { status: 400 },
      );
    }

    // Tautkan ID pesanan dan tandai ulasan terverifikasi
    const orderId = hasPurchased.orderId;
    const isVerified = true;

    // Simpan ulasan baru ke database
    const newReview = await prisma.review.create({
      data: {
        productId,
        userId,
        orderId,
        rating: Math.round(rating),
        comment: comment || null,
        images: Array.isArray(images) ? images : [],
        isVerified,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    return NextResponse.json(
      {
        success: true,
        message: "Ulasan berhasil ditambahkan",
        data: {
          review: newReview,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

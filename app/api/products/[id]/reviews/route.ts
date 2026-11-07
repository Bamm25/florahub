import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createReviewSchema } from "@/lib/validations/schemas";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

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

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: productId } = await params;

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

    // Check if user has purchased and received the product
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

    // Use the hasPurchased order for verified review
    const orderId = hasPurchased.orderId;
    const isVerified = true; // Always true since we validated purchase above

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

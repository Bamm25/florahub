import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: productId } = await params;

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

    const reviews = await prisma.review.findMany({
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
    });

    const totalReview = reviews.length;
    let averageRating = 0;
    if (totalReview > 0) {
      const sumRating = reviews.reduce((sum, item) => sum + item.rating, 0);
      averageRating = Number((sumRating / totalReview).toFixed(1));
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
          totalReview,
          averageRating,
        },
        reviews,
      },
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat memberikan ulasan",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any).id;
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
    const { rating, comment, images } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Rating wajib berupa angka dari 1 sampai 5",
        },
        { status: 400 },
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

    const verifiedOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: {
          in: ["PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"],
        },
        items: {
          some: {
            productId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const isVerified = Boolean(verifiedOrder);
    const orderId = verifiedOrder ? verifiedOrder.id : null;

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
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: productId } = await params;

    // Check if user has delivered order with this product
    const deliveredOrder = await prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: "DELIVERED",
        },
        productId,
      },
      select: {
        id: true,
      },
    });

    if (deliveredOrder) {
      return NextResponse.json({
        success: true,
        data: {
          canReview: true,
          status: "DELIVERED",
          message: null,
        },
      });
    }

    // Check if user has pending order (not yet delivered)
    const pendingOrder = await prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: { in: ["PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED"] },
        },
        productId,
      },
      select: {
        id: true,
        order: {
          select: {
            status: true,
          },
        },
      },
    });

    if (pendingOrder) {
      return NextResponse.json({
        success: true,
        data: {
          canReview: false,
          status: "PENDING",
          message: "Ulasan tersedia setelah pesanan diterima",
        },
      });
    }

    // User has not purchased the product
    return NextResponse.json({
      success: true,
      data: {
        canReview: false,
        status: "NOT_PURCHASED",
        message: "Beli produk ini untuk memberikan ulasan",
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

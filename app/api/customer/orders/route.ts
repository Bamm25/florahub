import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const validStatuses = [
      "PENDING",
      "PAID",
      "PROCESSING",
      "READY_TO_SHIP",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status order tidak valid",
        },
        { status: 400 },
      );
    }

    const whereClause: any = {
      userId: userId,
    };

    if (status) {
      whereClause.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          payment: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.order.count({
        where: whereClause,
      }),
    ]);

    const ordersSummary = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      itemCount: order.items.length,
      createdAt: order.createdAt,
      payment: {
        status: order.payment?.status,
      },
    }));

        return NextResponse.json({
          success: true,
          message: "Riwayat order berhasil diambil",
          data: {
            orders: ordersSummary,
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
        message: "Gagal mengambil riwayat order",
      },
      { status: 500 },
    );
  }
}

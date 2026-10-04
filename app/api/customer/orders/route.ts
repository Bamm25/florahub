import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
          message: "Forbidden: Hanya customer yang dapat melihat order",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

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

    const orders = await prisma.order.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

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
        total: orders.length,
        orders: ordersSummary,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil riwayat order",
      },
      { status: 500 },
    );
  }
}

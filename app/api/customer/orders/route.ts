import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

// Handler HTTP GET untuk mengambil riwayat pesanan pelanggan dengan filter status dan paginasi
export async function GET(request: Request) {
  try {
    // Validasi sesi pengguna dan ambil ID pelanggan
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

    // Validasi nilai parameter status pesanan
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status order tidak valid",
        },
        { status: 400 },
      );
    }

    // Bangun klausa filter pencarian pesanan berdasarkan status dan ID pelanggan
    const whereClause: Prisma.OrderWhereInput = {
      userId: userId,
    };

    if (status && validStatuses.includes(status)) {
      whereClause.status = status as Prisma.EnumOrderStatusFilter;
    }

    // Ambil daftar pesanan beserta rincian item, pembayaran, dan pengiriman
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
          shipment: {
            select: {
              id: true,
              status: true,
              courier: true,
              trackingNumber: true,
            },
          },
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

    // Format data ringkasan pesanan untuk konsumsi klien
    const ordersSummary = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      itemCount: order.items.length,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          image: item.product.image,
        },
      })),
      payment: {
        status: order.payment?.status,
      },
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            status: order.shipment.status,
            courier: order.shipment.courier,
            trackingNumber: order.shipment.trackingNumber,
          }
        : null,
    }));

    // Kirim respons daftar pesanan beserta metadata paginasi
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
    // Tangani galat otentikasi dan kegagalan pengambilan data pesanan
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

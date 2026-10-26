import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const statusParam = searchParams.get("status");
    const isPreorderParam = searchParams.get("isPreorder");
    const whereClause: any = {};

    if (
      statusParam &&
      typeof statusParam === "string" &&
      statusParam.trim() !== ""
    ) {
      whereClause.status = statusParam.trim();
    }
    if (isPreorderParam !== null) {
      whereClause.isPreorder = isPreorderParam === "true";
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  image: true,
                },
              },
            },
          },
          payment: true,
          shipment: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Daftar pesanan berhasil diambil",
      data: {
        orders,
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
        message: "Gagal mengambil data pesanan",
      },
      { status: 500 },
    );
  }
}

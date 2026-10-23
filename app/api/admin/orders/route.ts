import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
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

    const orders = await prisma.order.findMany({
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
    });

    return NextResponse.json({
      success: true,
      data: orders,
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

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
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya Admin yang dapat mengakses data pesanan global",
        },
        { status: 403 },
      );
    }
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
    console.error("Error mengambil data pesanan admin:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data pesanan",
      },
      { status: 500 },
    );
  }
}

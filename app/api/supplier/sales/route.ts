import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);

    const whereClause: any = {};
    if (userRole === "SUPPLIER") {
      whereClause.stock = { supplierId: userId };
    }

    const sales = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            variety: true,
            pricePerUnit: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat penjualan" },
      { status: 500 },
    );
  }
}

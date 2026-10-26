import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (userRole === "SUPPLIER") {
      whereClause.stock = { supplierId: userId };
    }

    const [sales, total] = await Promise.all([
      prisma.stockTransaction.findMany({
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.stockTransaction.count({
        where: whereClause,
      }),
    ]);

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

import { requireAuth } from "@/lib/middleware/requireAuth";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/config/domain";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar inventaris bahan baku florist (dipakai oleh BOMModal)
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, 20, 100);

    const whereClause: Prisma.FloristInventoryWhereInput = { floristId: userId };

    const [inventory, total] = await Promise.all([
      prisma.floristInventory.findMany({
        where: whereClause,
        include: {
          stock: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.floristInventory.count({
        where: whereClause,
      }),
    ]);

    const lowStockCount = inventory.filter(
      (inv) => inv.quantity < inv.minThreshold,
    ).length;

    const inventoriesWithFlag = inventory.map((inv) => ({
      ...inv,
      isLowStock: inv.quantity < inv.minThreshold,
    }));

    return NextResponse.json({
      success: true,
      message: "Daftar inventory berhasil diambil",
      data: {
        inventories: inventoriesWithFlag,
        lowStockCount,
        pagination: buildPaginationMeta(page, limit, total),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data inventory" },
      { status: 500 },
    );
  }
}

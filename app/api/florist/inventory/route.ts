import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (userRole === "FLORIST") {
      whereClause.floristId = userId;
    }

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
                  email: true,
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
      { success: false, message: "Gagal mengambil data inventory" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const body = await request.json();
    const { stockId, quantity, minThreshold, maxCapacity, location } = body;

    if (!stockId || !quantity) {
      return NextResponse.json(
        {
          success: false,
          message: "stockId dan quantity wajib diisi",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity harus lebih dari 0",
        },
        { status: 400 },
      );
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });
    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock supplier tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (!stock.isAvailable) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock supplier ini sedang tidak tersedia",
        },
        { status: 400 },
      );
    }

    const existingInventory = await prisma.floristInventory.findUnique({
      where: {
        floristId_stockId: {
          floristId: userId,
          stockId,
        },
      },
    });

    if (existingInventory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inventory untuk stock ini sudah ada. Gunakan PUT untuk update quantity.",
        },
        { status: 409 },
      );
    }

    const inventory = await prisma.floristInventory.create({
      data: {
        floristId: userId,
        stockId,
        quantity,
        minThreshold: minThreshold || 10,
        maxCapacity: maxCapacity || null,
        location: location || null,
        lastRestockDate: new Date(),
      },
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Inventory berhasil ditambahkan",
        data: {
          inventory,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan inventory" },
      { status: 500 },
    );
  }
}

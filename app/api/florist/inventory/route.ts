import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createInventorySchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar inventaris bahan baku florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);

    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Filter inventaris berdasarkan ID florist
    const whereClause: any = {};
    if (userRole === "FLORIST") {
      whereClause.floristId = userId;
    }

    // Ambil data inventaris beserta relasi stok supplier dan total data
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

    // Hitung item inventaris dengan kuantitas di bawah ambang batas minimum
    const lowStockCount = inventory.filter(
      (inv) => inv.quantity < inv.minThreshold,
    ).length;

    // Tambahkan indikator status stok menipis pada setiap data inventaris
    const inventoriesWithFlag = inventory.map((inv) => ({
      ...inv,
      isLowStock: inv.quantity < inv.minThreshold,
    }));

    // Kembalikan respon sukses beserta data paginasi inventaris
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
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data inventory" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan bahan baku baru ke inventaris florist
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    
    try {
      // Parsing dan validasi request body menggunakan skema Zod
      const body = await request.json();
      const validatedData = createInventorySchema.parse(body);
      const { stockId, quantity, location, notes } = validatedData;

    // Cari data stok supplier di database
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });
    // Validasi keberadaan stok supplier
    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock supplier tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi ketersediaan stok supplier
    if (!stock.isAvailable) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock supplier ini sedang tidak tersedia",
        },
        { status: 400 },
      );
    }

    // Periksa apakah stok sudah pernah ditambahkan ke inventaris florist
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

    // Buat catatan inventaris baru di database
    const inventory = await prisma.floristInventory.create({
      data: {
        floristId: userId,
        stockId,
        quantity,
        minThreshold: 10,
        maxCapacity: null,
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

    // Kirim notifikasi peringatan stok rendah jika kuantitas awal di bawah ambang batas
    if (inventory.quantity < inventory.minThreshold) {
      await prisma.notification.create({
        data: {
          userId: inventory.floristId,
          title: "Stok Rendah!",
          message: `Stok ${inventory.stock.name} hanya tersisa ${inventory.quantity} ${inventory.stock.unit}. Segera lakukan restock (minimum: ${inventory.minThreshold} ${inventory.stock.unit}).`,
          type: "LOW_STOCK_ALERT",
          link: `/florist/inventory`,
          isRead: false,
        },
      });
    }

    // Kembalikan respon sukses pembuatan inventaris
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
      // Tangani error validasi skema Zod
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan inventory" },
      { status: 500 },
    );
  }
}

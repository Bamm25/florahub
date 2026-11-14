import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk florist menjelajahi stok bunga langsung milik supplier (transaksi biasa tanpa pre-order)
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["FLORIST", "ADMIN"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const variety = searchParams.get("variety") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isAvailable: true,
      quantity: { gt: 0 },
    };

    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { variety: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (variety !== "ALL") {
      whereClause.variety = { equals: variety, mode: "insensitive" };
    }

    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where: whereClause,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              addresses: {
                where: { isDefault: true },
                take: 1,
                select: {
                  city: true,
                  province: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.stock.count({
        where: whereClause,
      }),
    ]);

    const formattedStocks = stocks.map((s) => {
      const supplierAddr = s.supplier.addresses[0];
      return {
        id: s.id,
        name: s.name,
        variety: s.variety || "Standar",
        quantity: s.quantity,
        unit: s.unit,
        pricePerUnit: s.pricePerUnit,
        harvestDate: s.harvestDate ? s.harvestDate.toISOString() : null,
        location: s.location || supplierAddr?.city || "Kebun Mitra",
        supplier: {
          id: s.supplier.id,
          name: s.supplier.name,
          email: s.supplier.email,
          city: supplierAddr?.city || "Kota Batu",
          province: supplierAddr?.province || "Jawa Timur",
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pasokan bunga supplier berhasil diambil",
      data: {
        stocks: formattedStocks,
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
    reportServerError("Error fetching supplier stocks for florist:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memuat pasokan bunga supplier" },
      { status: 500 },
    );
  }
}

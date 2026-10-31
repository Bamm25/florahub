import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { createStockSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where: { supplierId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stock.count({
        where: { supplierId: userId },
      }),
    ]);

    const lowStockCount = stocks.filter((stock) => stock.quantity < 50).length;

    return NextResponse.json({
      success: true,
      message: "Daftar stock berhasil diambil",
      data: {
        stocks,
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
      { success: false, message: "Gagal mengambil data stok" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    
    try {
      const body = await request.json();
      const validatedData = createStockSchema.parse(body);
      const { name, variety, unit, pricePerUnit, quantity } = validatedData;

      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      const newStock = await prisma.stock.create({
        data: {
          supplierId: userId,
          name,
          variety,
          quantity,
          unit,
          pricePerUnit,
        },
      });

      await createAuditLog({
        userId,
        action: "CREATE",
        entity: "Stock",
        entityId: newStock.id,
        newValue: {
          name: newStock.name,
          quantity: newStock.quantity,
          pricePerUnit: newStock.pricePerUnit,
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Stok bunga berhasil ditambahkan",
          data: newStock,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menambah stok bunga" },
      { status: 500 },
    );
  }
}

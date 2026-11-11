import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { createStockSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar stok milik supplier
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Ambil daftar stok dan total data milik supplier
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

    // Hitung jumlah item dengan stok menipis (di bawah 50)
    const lowStockCount = stocks.filter((stock) => stock.quantity < 50).length;

    // Kembalikan respon sukses beserta data paginasi stok
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
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data stok" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan stok bunga baru oleh supplier
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    
    try {
      // Parsing dan validasi request body menggunakan skema Zod
      const body = await request.json();
      const validatedData = createStockSchema.parse(body);
      const { name, variety, unit, pricePerUnit, quantity } = validatedData;

      // Ambil metadata IP address dan user-agent untuk audit log
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      // Simpan stok bunga baru ke database
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

      // Catat aktivitas penambahan stok ke audit log
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

      // Kembalikan respon sukses pembuatan stok
      return NextResponse.json(
        {
          success: true,
          message: "Stok bunga berhasil ditambahkan",
          data: newStock,
        },
        { status: 201 },
      );
    } catch (error) {
      // Tangani error validasi skema Zod
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
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
      { success: false, message: "Gagal menambah stok bunga" },
      { status: 500 },
    );
  }
}

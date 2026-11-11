import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil riwayat transaksi penjualan bagi supplier
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    // Filter stok milik supplier jika bukan admin
    if (userRole === "SUPPLIER") {
      whereClause.stock = { supplierId: userId };
    }

    // Ambil daftar transaksi penjualan beserta relasi stok dan florist
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

    // Kembalikan respon sukses data penjualan
    return NextResponse.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat penjualan" },
      { status: 500 },
    );
  }
}

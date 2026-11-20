import { requireAuth } from "@/lib/middleware/requireAuth";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/config/domain";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil riwayat transaksi penjualan bagi supplier
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, 20, 100);
    const whereClause: Prisma.StockTransactionWhereInput = {
      stock: { supplierId: userId },
    };

    // Ambil daftar transaksi penjualan beserta relasi stok, florist, dan total data
    const [sales, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: whereClause,
        include: {
          stock: {
            select: {
              id: true,
              name: true,
              variety: true,
              unit: true,
              pricePerUnit: true,
            },
          },
          florist: {
            select: {
              id: true,
              name: true,
              email: true,
              floristProfile: {
                select: {
                  shopName: true,
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
      prisma.stockTransaction.count({ where: whereClause }),
    ]);

    const normalizedSales = sales.map((sale) => ({
      ...sale,
      florist: {
        id: sale.florist.id,
        name: sale.florist.floristProfile?.shopName || sale.florist.name,
        email: sale.florist.email,
      },
    }));

    // Kembalikan respon sukses data penjualan beserta metadata paginasi
    return NextResponse.json({
      success: true,
      data: normalizedSales,
      pagination: buildPaginationMeta(page, limit, total),
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

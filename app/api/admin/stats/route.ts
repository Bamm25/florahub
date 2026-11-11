import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil statistik keseluruhan sistem oleh admin
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil metrik ringkasan pengguna, produk, kategori, pesanan, dan total pendapatan secara paralel
    const [
      totalUsers,
      totalAdmins,
      totalSuppliers,
      totalFlorists,
      totalCustomers,
      totalProducts,
      activeProducts,
      totalCategories,
      totalOrders,
      revenueResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "SUPPLIER" } }),
      prisma.user.count({ where: { role: "FLORIST" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),

      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),

      prisma.flowerCategory.count(),

      prisma.order.count(),

      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: {
            in: ["PAID", "DELIVERED"],
          },
        },
      }),
    ]);

    // Susun objek data statistik sistem
    const stats = {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        suppliers: totalSuppliers,
        florists: totalFlorists,
        customers: totalCustomers,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      categories: {
        total: totalCategories,
      },
      orders: {
        total: totalOrders,
        totalRevenue: revenueResult._sum.totalAmount || 0,
      },
    };

    // Kembalikan respon sukses data statistik sistem
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil statistik dashboard",
      },
      { status: 500 },
    );
  }
}

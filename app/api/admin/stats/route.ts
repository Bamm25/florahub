import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya Admin yang dapat mengakses data pengguna",
        },
        { status: 403 },
      );
    }

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

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error mengambil statistik dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil statistik dashboard",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
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

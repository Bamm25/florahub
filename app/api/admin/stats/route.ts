import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil statistik keseluruhan sistem oleh admin
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    await requireAuth(request, ["ADMIN"]);

    // Ambil metrik ringkasan pengguna, produk, kategori, pesanan, dan total pendapatan secara paralel
    const [
      // 1. Metrik Pengguna
      totalUsers,
      activeUsers,
      totalAdmins,
      totalSuppliers,
      totalFlorists,
      totalCustomers,
      // 2. Metrik Katalog Produk
      totalProducts,
      activeProducts,
      totalCategories,
      // 3. Metrik Pesanan Customer B2C
      totalOrders,
      b2cRevenueAgg,
      b2cPendingCount,
      b2cDeliveredCount,
      b2cCancelledCount,
      // 4. Metrik Penjualan Stok Langsung B2B
      totalDirectSales,
      b2bSalesRevenueAgg,
      b2bSalesPendingCount,
      // 5. Metrik Pre-Order Panen B2B
      totalPreOrders,
      b2bPreOrdersActiveAgg,
      b2bPreOrdersPendingApproval,
      b2bPreOrdersWaitingDeposit,
    ] = await Promise.all([
      // Pengguna
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "SUPPLIER" } }),
      prisma.user.count({ where: { role: "FLORIST" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      // Katalog
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.flowerCategory.count(),
      // B2C Customer Orders
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: {
            in: ["PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"],
          },
        },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      // B2B Direct Sales (StockTransaction)
      prisma.stockTransaction.count(),
      prisma.stockTransaction.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
        },
      }),
      prisma.stockTransaction.count({ where: { status: "PENDING" } }),
      // B2B Harvest Pre-Orders
      prisma.harvestPreOrder.count(),
      prisma.harvestPreOrder.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: {
            in: ["DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"],
          },
        },
      }),
      prisma.harvestPreOrder.count({ where: { status: "PENDING" } }),
      prisma.harvestPreOrder.count({ where: { status: "CONFIRMED" } }),
    ]);

    // Susun objek data statistik sistem
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: totalAdmins,
        suppliers: totalSuppliers,
        florists: totalFlorists,
        customers: totalCustomers,
      },
      catalog: {
        totalProducts,
        activeProducts,
        totalCategories,
      },
      b2cOrders: {
        total: totalOrders,
        settledRevenue: b2cRevenueAgg._sum.totalAmount || 0,
        pendingCount: b2cPendingCount,
        deliveredCount: b2cDeliveredCount,
        cancelledCount: b2cCancelledCount,
      },
      b2bSupply: {
        directSales: {
          total: totalDirectSales,
          settledRevenue: b2bSalesRevenueAgg._sum.totalPrice || 0,
          pendingCount: b2bSalesPendingCount,
        },
        preOrders: {
          total: totalPreOrders,
          committedValue: b2bPreOrdersActiveAgg._sum.totalPrice || 0,
          pendingApprovalCount: b2bPreOrdersPendingApproval,
          waitingDepositCount: b2bPreOrdersWaitingDeposit,
        },
      },
    };

    // Kembalikan respon sukses data statistik sistem
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Admin stats fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil statistik dashboard admin",
      },
      { status: 500 },
    );
  }
}

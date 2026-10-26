import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER", "ADMIN"]);
    // 1. Total Revenue (PAID transactions only)
    const revenueData = await prisma.stockTransaction.aggregate({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PAID",
      },
      _sum: {
        totalPrice: true,
      },
    });

    const totalRevenue = revenueData._sum.totalPrice || 0;

    // 2. Total Sales (all transactions)
    const totalSales = await prisma.stockTransaction.count({
      where: {
        stock: {
          supplierId: userId,
        },
      },
    });

    // 3. Stock Sold (PAID only)
    const stockSoldData = await prisma.stockTransaction.aggregate({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PAID",
      },
      _sum: {
        quantity: true,
      },
    });

    const stockSold = stockSoldData._sum.quantity || 0;

    // 4. Active Stocks
    const activeStocks = await prisma.stock.count({
      where: {
        supplierId: userId,
        isAvailable: true,
      },
    });

    // 5. Low Stock Alert (< 50)
    const lowStockAlert = await prisma.stock.count({
      where: {
        supplierId: userId,
        isAvailable: true,
        quantity: {
          lt: 50,
        },
      },
    });

    // 6. Pending Transactions
    const pendingTransactions = await prisma.stockTransaction.count({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PENDING",
      },
    });

    // 7. Average Order Value
    const avgOrderData = await prisma.stockTransaction.aggregate({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PAID",
      },
      _avg: {
        totalPrice: true,
      },
    });

    const averageOrderValue = avgOrderData._avg.totalPrice
      ? Math.round(Number(avgOrderData._avg.totalPrice))
      : 0;

    // 8. Monthly Revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTransactions = await prisma.stockTransaction.findMany({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PAID",
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        totalPrice: true,
        createdAt: true,
      },
    });

    const monthlyRevenue = monthlyTransactions.reduce(
      (acc: any, transaction) => {
        const month = transaction.createdAt.toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += transaction.totalPrice;
        return acc;
      },
      {},
    );

    const monthlyRevenueChart = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 9. Top 5 Stocks
    const topStocks = await prisma.stockTransaction.groupBy({
      by: ["stockId"],
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PAID",
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const stockIds = topStocks.map((t) => t.stockId);
    const stocks = await prisma.stock.findMany({
      where: {
        id: { in: stockIds },
        supplierId: userId,
      },
      select: {
        id: true,
        name: true,
        variety: true,
        pricePerUnit: true,
        quantity: true,
      },
    });

    const stockMap = new Map(stocks.map((s) => [s.id, s]));
    const topStocksWithDetails = topStocks.map((item) => ({
      ...stockMap.get(item.stockId),
      totalSold: item._sum.quantity || 0,
    }));

    // 10. Active Harvest Announcements
    const activeAnnouncements = await prisma.harvestAnnouncement.count({
      where: {
        supplierId: userId,
        isActive: true,
      },
    });

    // 11. Confirmed Pre-Orders
    const confirmedPreOrders = await prisma.harvestPreOrder.count({
      where: {
        announcement: {
          supplierId: userId,
        },
        status: "CONFIRMED",
      },
    });

    // 12. Recent Sales
    const recentSales = await prisma.stockTransaction.findMany({
      where: {
        stock: {
          supplierId: userId,
        },
      },
      select: {
        id: true,
        quantity: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        stock: {
          select: {
            name: true,
            variety: true,
          },
        },
        florist: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      message: "Dashboard data berhasil diambil",
      data: {
        summary: {
          totalRevenue,
          totalSales,
          stockSold,
          activeStocks,
          lowStockAlert,
          pendingTransactions,
          averageOrderValue,
        },
        harvestMetrics: {
          activeAnnouncements,
          confirmedPreOrders,
        },
        charts: {
          monthlyRevenue: monthlyRevenueChart,
          topStocks: topStocksWithDetails,
        },
        recentSales,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil dashboard data" },
      { status: 500 },
    );
  }
}

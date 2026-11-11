import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil metrik dan statistik dashboard supplier
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId } = await requireAuth(request, ["SUPPLIER", "ADMIN"]);
    // Hitung total pendapatan dari transaksi yang berstatus PAID
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

    // Hitung total jumlah seluruh transaksi penjualan
    const totalSales = await prisma.stockTransaction.count({
      where: {
        stock: {
          supplierId: userId,
        },
      },
    });

    // Hitung total kuantitas stok yang terjual pada transaksi berstatus PAID
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

    // Hitung total varian stok aktif yang tersedia
    const activeStocks = await prisma.stock.count({
      where: {
        supplierId: userId,
        isAvailable: true,
      },
    });

    // Hitung peringatan stok menipis dengan kuantitas kurang dari 50 unit
    const lowStockAlert = await prisma.stock.count({
      where: {
        supplierId: userId,
        isAvailable: true,
        quantity: {
          lt: 50,
        },
      },
    });

    // Hitung jumlah transaksi yang masih menunggu pembayaran (PENDING)
    const pendingTransactions = await prisma.stockTransaction.count({
      where: {
        stock: {
          supplierId: userId,
        },
        status: "PENDING",
      },
    });

    // Hitung rata-rata nilai transaksi penjualan berstatus PAID
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

    // Ambil data transaksi penjualan dalam 6 bulan terakhir untuk tren pendapatan bulanan
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

    // Format agregasi data pendapatan bulanan untuk diagram grafik
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

    // Ambil 5 stok terlaris berdasarkan kuantitas penjualan
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

    // Hitung jumlah pengumuman panen yang sedang aktif
    const activeAnnouncements = await prisma.harvestAnnouncement.count({
      where: {
        supplierId: userId,
        isActive: true,
      },
    });

    // Hitung jumlah pre-order panen yang telah dikonfirmasi
    const confirmedPreOrders = await prisma.harvestPreOrder.count({
      where: {
        announcement: {
          supplierId: userId,
        },
        status: "CONFIRMED",
      },
    });

    // Ambil riwayat 5 transaksi penjualan terkini
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

    // Kembalikan respon sukses data ringkasan dashboard supplier
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
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil dashboard data" },
      { status: 500 },
    );
  }
}

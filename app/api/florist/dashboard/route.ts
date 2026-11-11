import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil metrik ringkasan dan statistik dashboard florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Hitung total pendapatan dari pesanan berstatus DELIVERED
    const revenueData = await prisma.order.aggregate({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
        status: "DELIVERED",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenueData._sum.totalAmount || 0;

    // Hitung jumlah total pesanan yang melibatkan produk florist
    const totalOrders = await prisma.order.count({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
      },
    });

    // Hitung jumlah produk yang telah terjual pada pesanan DELIVERED
    const productsSoldData = await prisma.orderItem.aggregate({
      where: {
        product: {
          floristId: userId,
        },
        order: {
          status: "DELIVERED",
        },
      },
      _sum: {
        quantity: true,
      },
    });
    const productsSold = productsSoldData._sum.quantity || 0;

    // Hitung jumlah produk florist yang aktif
    const activeProducts = await prisma.product.count({
      where: {
        floristId: userId,
        isActive: true,
      },
    });

    // Hitung jumlah produk florist dengan stok menipis (di bawah 10 unit)
    const lowStockProducts = await prisma.product.count({
      where: {
        floristId: userId,
        isActive: true,
        stock: {
          lt: 10,
        },
      },
    });

    // Hitung nilai rata-rata ulasan produk florist
    const ratingData = await prisma.review.aggregate({
      where: {
        product: {
          floristId: userId,
        },
      },
      _avg: {
        rating: true,
      },
    });

    const averageRating = ratingData._avg.rating
      ? Number(ratingData._avg.rating.toFixed(1))
      : 0;

    // Ambil data pesanan selesai dalam 6 bulan terakhir untuk tren pendapatan bulanan
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
        status: "DELIVERED",
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Susun agregasi pendapatan bulanan untuk diagram grafik
    const monthlyRevenue = monthlyOrders.reduce((acc: any, order) => {
      const month = order.createdAt.toISOString().slice(0, 7);
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += order.totalAmount;
      return acc;
    }, {});

    const monthlyRevenueChart = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Ambil 5 produk terlaris berdasarkan kuantitas penjualan
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        product: {
          floristId: userId,
        },
        order: {
          status: "DELIVERED",
        },
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

    const productIds = topProducts.map((t) => t.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        floristId: userId,
      },
      select: {
        id: true,
        name: true,
        image: true,
        price: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProductsWithDetails = topProducts.map((item) => ({
      ...productMap.get(item.productId),
      totalSold: item._sum.quantity || 0,
    }));

    // Ambil 5 pesanan terkini yang masuk ke toko florist
    const recentOrders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: {
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

    // Hitung jumlah pesanan yang sedang menunggu atau dalam proses
    const pendingOrders = await prisma.order.count({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
        status: {
          in: ["PENDING", "PAID", "PROCESSING"],
        },
      },
    });

    // Ambil data profil toko florist untuk informasi dashboard
    const floristProfile = await prisma.floristProfile.findUnique({
      where: { userId },
      select: {
        shopName: true,
        shopDescription: true,
        logo: true,
        banner: true,
        defaultAddressId: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Ambil alamat penjemputan default toko florist
    let defaultAddress = null;
    if (floristProfile?.defaultAddressId) {
      defaultAddress = await prisma.address.findFirst({
        where: { id: floristProfile.defaultAddressId, userId, isDefault: true },
      });
    }

    // Kembalikan respon sukses seluruh metrik dashboard florist
    return NextResponse.json({
      success: true,
      message: "Dashboard data berhasil diambil",
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          productsSold,
          activeProducts,
          lowStockProducts,
          averageRating,
          pendingOrders,
        },
        charts: {
          monthlyRevenue: monthlyRevenueChart,
          topProducts: topProductsWithDetails,
        },
        recentOrders,
        floristInfo: {
          shopName: floristProfile?.shopName || "",
          shopDescription: floristProfile?.shopDescription || "",
          logo: floristProfile?.logo || null,
          banner: floristProfile?.banner || null,
          name: floristProfile?.user.name || "",
          email: floristProfile?.user.email || "",
          phone: floristProfile?.user.phone || "",
          address: defaultAddress,
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("[FLORIST_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil dashboard data" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
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

    const activeProducts = await prisma.product.count({
      where: {
        floristId: userId,
        isActive: true,
      },
    });

    const lowStockProducts = await prisma.product.count({
      where: {
        floristId: userId,
        isActive: true,
        stock: {
          lt: 10,
        },
      },
    });

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

    const monthlyRevenue = monthlyOrders.reduce((acc: any, order) => {
      const month = order.createdAt.toISOString().slice(0, 7); // "2026-10"
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

    // Gunakan nama toko dari profil untuk dashboard.
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

    // Get default address
    let defaultAddress = null;
    if (floristProfile?.defaultAddressId) {
      defaultAddress = await prisma.address.findFirst({
        where: { id: floristProfile.defaultAddressId, userId, isDefault: true },
      });
    }

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

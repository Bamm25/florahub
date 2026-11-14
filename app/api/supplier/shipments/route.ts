import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil seluruh riwayat pengiriman supplier (Pre-Order Panen & Penjualan Stok)
export async function GET(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "ALL";

    // 1. Ambil pengiriman dari HarvestPreOrder
    const preOrderWhere: any = {};
    if (userRole === "SUPPLIER") {
      preOrderWhere.announcement = { supplierId: userId };
    }
    // Hanya ambil yang sudah dalam alur pengiriman atau selesai
    preOrderWhere.status = {
      in: ["SHIPPED", "DELIVERED", "PAID"],
    };

    const preOrders = await prisma.harvestPreOrder.findMany({
      where: preOrderWhere,
      include: {
        announcement: true,
        florist: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 2. Ambil pengiriman dari StockTransaction
    const saleWhere: any = {};
    if (userRole === "SUPPLIER") {
      saleWhere.stock = { supplierId: userId };
    }
    saleWhere.status = {
      in: ["SHIPPED", "DELIVERED", "PAID"],
    };

    const directSales = await prisma.stockTransaction.findMany({
      where: saleWhere,
      include: {
        stock: true,
        florist: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 3. Normalisasi data ke struktur Shipment terpadu
    const unifiedShipments = [
      ...preOrders.map((p) => {
        const destAddr = p.florist.addresses[0];
        return {
          id: p.id,
          orderType: "PREORDER" as const,
          orderId: p.id,
          orderNumber: `PO-${p.id.slice(-8).toUpperCase()}`,
          courier: p.courier || "Menunggu Kurir",
          service: p.service || null,
          trackingNumber: p.trackingNumber || null,
          status: p.status, // PAID, SHIPPED, DELIVERED
          shippingCost: p.shippingCost || 0,
          weight: p.weight || p.quantity * 100, // gram
          biteshipOrderId: p.biteshipOrderId || null,
          biteshipLabelUrl: p.biteshipLabelUrl || null,
          shippedAt: p.shippedAt ? p.shippedAt.toISOString() : null,
          deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
          itemName: `${p.announcement.flowerName} (${p.quantity} tangkai)`,
          totalAmount: p.totalPrice,
          recipient: {
            name: p.florist.name,
            email: p.florist.email,
            phone: p.florist.phone || destAddr?.phone || "-",
            address: destAddr
              ? `${destAddr.fullAddress}, ${destAddr.city}, ${destAddr.province} ${destAddr.postalCode}`
              : "Alamat Florist Terdaftar",
          },
        };
      }),
      ...directSales.map((s) => {
        const destAddr = s.florist.addresses[0];
        return {
          id: s.id,
          orderType: "DIRECT_SALE" as const,
          orderId: s.id,
          orderNumber: `SL-${s.id.slice(-8).toUpperCase()}`,
          courier: s.courier || "Menunggu Kurir",
          service: s.service || null,
          trackingNumber: s.trackingNumber || null,
          status: s.status, // PAID, SHIPPED, DELIVERED
          shippingCost: s.shippingCost || 0,
          weight: s.weight || s.quantity * 100, // gram
          biteshipOrderId: s.biteshipOrderId || null,
          biteshipLabelUrl: s.biteshipLabelUrl || null,
          shippedAt: s.shippedAt ? s.shippedAt.toISOString() : null,
          deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
          createdAt: s.createdAt.toISOString(),
          itemName: `${s.stock.name} (${s.quantity} tangkai)`,
          totalAmount: s.totalPrice,
          recipient: {
            name: s.florist.name,
            email: s.florist.email,
            phone: s.florist.phone || destAddr?.phone || "-",
            address: destAddr
              ? `${destAddr.fullAddress}, ${destAddr.city}, ${destAddr.province} ${destAddr.postalCode}`
              : "Alamat Florist Terdaftar",
          },
        };
      }),
    ];

    // Filter berdasarkan status jika diminta
    const filtered =
      statusFilter === "ALL"
        ? unifiedShipments
        : unifiedShipments.filter((s) => s.status === statusFilter);

    // Urutkan dari yang terbaru
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      success: true,
      data: {
        shipments: filtered,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier shipments:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengiriman supplier" },
      { status: 500 },
    );
  }
}

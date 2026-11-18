import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil pesanan yang sudah LUNAS (PAID) dan siap dibuatkan resi pengiriman
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);

    // 1. Pre-Order Panen yang sudah LUNAS (PAID) dan belum berstatus SHIPPED / DELIVERED
    const preOrderWhere: Prisma.HarvestPreOrderWhereInput = {
      status: "PAID",
      shippedAt: null,
      biteshipOrderId: null,
      announcement: { supplierId: userId },
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

    // 2. Penjualan Stok yang sudah LUNAS (PAID) dan belum berstatus SHIPPED / DELIVERED
    const saleWhere: Prisma.StockTransactionWhereInput = {
      status: "PAID",
      shippedAt: null,
      biteshipOrderId: null,
      stock: { supplierId: userId },
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

    const readyOrders = [
      ...preOrders.map((p) => {
        const destAddr = p.florist.addresses[0];
        return {
          id: p.id,
          orderType: "PREORDER" as const,
          orderNumber: `PO-${p.id.slice(-8).toUpperCase()}`,
          totalAmount: p.totalPrice,
          quantity: p.quantity,
          itemName: `${p.announcement.flowerName} (${p.announcement.variety || "Standar"})`,
          weight: p.quantity * 100, // gram
          buyer: {
            name: p.florist.name,
            email: p.florist.email,
            phone: p.florist.phone || destAddr?.phone || null,
            address: destAddr
              ? `${destAddr.fullAddress}, ${destAddr.city}`
              : null,
            postalCode: destAddr?.postalCode || null,
          },
        };
      }),
      ...directSales.map((s) => {
        const destAddr = s.florist.addresses[0];
        return {
          id: s.id,
          orderType: "DIRECT_SALE" as const,
          orderNumber: `SL-${s.id.slice(-8).toUpperCase()}`,
          totalAmount: s.totalPrice,
          quantity: s.quantity,
          itemName: `${s.stock.name} (${s.stock.variety || "Standar"})`,
          weight: s.quantity * 100, // gram
          buyer: {
            name: s.florist.name,
            email: s.florist.email,
            phone: s.florist.phone || destAddr?.phone || null,
            address: destAddr
              ? `${destAddr.fullAddress}, ${destAddr.city}`
              : null,
            postalCode: destAddr?.postalCode || null,
          },
        };
      }),
    ];

    return NextResponse.json({
      success: true,
      data: {
        orders: readyOrders,
      },
    });
  } catch (error) {
    reportServerError("Error fetching ready-to-ship orders:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memuat pesanan siap kirim" },
      { status: 500 },
    );
  }
}

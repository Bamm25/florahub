import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import {
  fulfillPreOrderToInventory,
  fulfillSaleToInventory,
} from "@/lib/supply-chain/fulfill-inventory";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP POST untuk mensimulasikan kurir telah mengantarkan paket (testing environment)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Simulator is only available for local development with an explicit opt-in.
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_BITESHIP_SIMULATOR !== "true") {
      return NextResponse.json({ success: false, message: "Simulator disabled" }, { status: 404 });
    }
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id: shipmentId } = await params;

    // 1. Cek apakah ini Pre-Order Panen
    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      include: { announcement: true, florist: true },
    });

    if (preOrder) {
      if ((userRole === "FLORIST" && preOrder.floristId !== userId) || preOrder.status !== "SHIPPED" || !preOrder.biteshipOrderId) {
        return NextResponse.json({ success: false, message: "Forbidden or shipment not in transit" }, { status: 403 });
      }
      const credited = await fulfillPreOrderToInventory(shipmentId);
      if (!credited) return NextResponse.json({ success: false, message: "Already received" }, { status: 409 });
      const updated = await prisma.harvestPreOrder.findUnique({ where: { id: shipmentId } });

      // Notifikasi ke florist
      await prisma.notification.create({
        data: {
          userId: preOrder.floristId,
          title: "Bunga Telah Sampai di Toko!",
          message: `Pengiriman ${preOrder.announcement.flowerName} (${preOrder.quantity} tangkai) telah tiba dan otomatis masuk ke inventaris bahan baku Anda.`,
          type: "SHIPMENT_UPDATE",
          link: "/florist/inventory",
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Pengiriman pre-order berhasil disimulasikan tiba di tujuan dan stok masuk ke florist",
        data: { preOrder: updated },
      });
    }

    // 2. Cek apakah ini Penjualan Stok Langsung
    const directSale = await prisma.stockTransaction.findUnique({
      where: { id: shipmentId },
      include: { stock: true, florist: true },
    });

    if (directSale) {
      if ((userRole === "FLORIST" && directSale.floristId !== userId) || directSale.status !== "SHIPPED" || !directSale.biteshipOrderId) {
        return NextResponse.json({ success: false, message: "Forbidden or shipment not in transit" }, { status: 403 });
      }
      const credited = await fulfillSaleToInventory(shipmentId);
      if (!credited) return NextResponse.json({ success: false, message: "Already received" }, { status: 409 });
      const updated = await prisma.stockTransaction.findUnique({ where: { id: shipmentId } });

      // Notifikasi ke florist
      await prisma.notification.create({
        data: {
          userId: directSale.floristId,
          title: "Bahan Baku Telah Sampai di Toko!",
          message: `Pengiriman ${directSale.stock.name} (${directSale.quantity} tangkai) telah tiba dan otomatis masuk ke inventaris bahan baku Anda.`,
          type: "SHIPMENT_UPDATE",
          link: "/florist/inventory",
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Pengiriman stok berhasil disimulasikan tiba di tujuan dan stok masuk ke florist",
        data: { sale: updated },
      });
    }

    return NextResponse.json(
      { success: false, message: "Data pengiriman tidak ditemukan" },
      { status: 404 },
    );
  } catch (error) {
    reportServerError("Error simulating delivered shipment:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mensimulasikan pengiriman selesai",
      },
      { status: 500 },
    );
  }
}

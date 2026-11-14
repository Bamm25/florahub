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

// Handler HTTP POST untuk simulasi / pembaruan status kurir Biteship (Sandbox / Testing)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id: shipmentId } = await params;
    const body = await request.json().catch(() => ({}));
    const targetStatus = body.status; // "SHIPPED" | "DELIVERED"

    if (!["SHIPPED", "DELIVERED"].includes(targetStatus)) {
      return NextResponse.json(
        { success: false, message: "Status target harus SHIPPED atau DELIVERED" },
        { status: 400 },
      );
    }

    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      include: {
        announcement: { select: { supplierId: true, flowerName: true } },
        florist: { select: { id: true, name: true } },
      },
    });

    let directSale = null;
    if (!preOrder) {
      directSale = await prisma.stockTransaction.findUnique({
        where: { id: shipmentId },
        include: {
          stock: { select: { supplierId: true, name: true } },
          florist: { select: { id: true, name: true } },
        },
      });
    }

    const record = preOrder || directSale;
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Pengiriman tidak ditemukan" },
        { status: 404 },
      );
    }

    const supplierId = preOrder
      ? preOrder.announcement.supplierId
      : directSale?.stock.supplierId;
    const floristId = record.floristId;

    if (userRole !== "ADMIN" && supplierId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Hanya supplier pemilik barang yang dapat mengatur status pengiriman" },
        { status: 403 },
      );
    }

    if (!record.biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Pengiriman belum dibuat melalui Biteship" },
        { status: 400 },
      );
    }

    const flowerName = preOrder ? preOrder.announcement.flowerName : directSale?.stock.name;
    const now = new Date();

    if (targetStatus === "SHIPPED") {
      if (preOrder) {
        await prisma.harvestPreOrder.updateMany({
          where: { id: shipmentId, status: { in: ["PAID", "CONFIRMED"] } },
          data: { status: "SHIPPED", shippedAt: record.shippedAt || now },
        });
      } else {
        await prisma.stockTransaction.updateMany({
          where: { id: shipmentId, status: { in: ["PAID", "PENDING"] } },
          data: { status: "SHIPPED", shippedAt: record.shippedAt || now },
        });
      }

      // Notifikasi florist bahwa kurir telah mengambil paket
      await prisma.notification.create({
        data: {
          userId: floristId,
          title: "Paket Bunga Telah Dijemput Kurir!",
          message: `Kurir ${record.courier || "Biteship"} telah menjemput pesanan ${record.quantity} tangkai ${flowerName}. Paket dalam perjalanan ke toko Anda.`,
          type: "SHIPMENT_UPDATE",
          link: preOrder ? "/florist/harvest-plans" : "/florist/supplier-stocks",
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Status kurir berhasil diperbarui: Paket Dijemput (SHIPPED)",
        data: { status: "SHIPPED" },
      });
    }

    if (targetStatus === "DELIVERED") {
      if (preOrder) {
        await fulfillPreOrderToInventory(shipmentId);
      } else {
        await fulfillSaleToInventory(shipmentId);
      }

      // Notifikasi ke supplier
      if (supplierId) {
        await prisma.notification.create({
          data: {
            userId: supplierId,
            title: "Bunga Telah Sampai di Florist!",
            message: `Pesanan ${record.quantity} tangkai ${flowerName} telah sampai di tujuan dan diterima oleh florist ${record.florist.name}. Transaksi selesai.`,
            type: "SHIPMENT_UPDATE",
            link: "/supplier/shipments",
            isRead: false,
          },
        });
      }

      // Notifikasi ke florist
      await prisma.notification.create({
        data: {
          userId: floristId,
          title: "Bunga Berhasil Diterima!",
          message: `Pesanan ${record.quantity} tangkai ${flowerName} telah sampai. Stok otomatis ditambahkan ke inventaris florist Anda.`,
          type: "SHIPMENT_UPDATE",
          link: "/florist/inventory",
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Status kurir berhasil diperbarui: Paket Sampai & Diterima (DELIVERED)",
        data: { status: "DELIVERED" },
      });
    }

    return NextResponse.json({ success: false, message: "Unhandled status" }, { status: 400 });
  } catch (error) {
    reportServerError("Error simulating shipment status:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal memperbarui status pengiriman",
      },
      { status: 500 },
    );
  }
}

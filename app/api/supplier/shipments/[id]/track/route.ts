import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import {
  fulfillPreOrderToInventory,
  fulfillSaleToInventory,
} from "@/lib/supply-chain/fulfill-inventory";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk melacak posisi dan riwayat pengiriman kurir Biteship
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "FLORIST",
    ]);
    const { id: shipmentId } = await params;

    // Cari di HarvestPreOrder dulu
    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      include: {
        announcement: { include: { supplier: { select: { id: true, name: true } } } },
        florist: { select: { id: true, name: true } },
      },
    });

    let directSale = null;
    if (!preOrder) {
      directSale = await prisma.stockTransaction.findUnique({
        where: { id: shipmentId },
        include: {
          stock: { include: { supplier: { select: { id: true, name: true } } } },
          florist: { select: { id: true, name: true } },
        },
      });
    }

    const orderData = preOrder || directSale;
    if (!orderData) {
      return NextResponse.json(
        { success: false, message: "Data pengiriman tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi kepemilikan
    const supplierId = preOrder
      ? preOrder.announcement.supplierId
      : directSale?.stock.supplierId;
    const floristId = orderData.floristId;

    if (userRole === "SUPPLIER" && supplierId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    if (userRole === "FLORIST" && floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    if (!orderData.biteshipOrderId) {
      return NextResponse.json({ success: false, message: "Pengiriman belum dibuat di Biteship" }, { status: 409 });
    }

    // Hubungi Biteship Client
    const biteshipClient = getBiteshipClient();
    const biteshipOrder = await biteshipClient.getOrder(
      orderData.biteshipOrderId,
    );
    const newStatus = mapBiteshipStatus(biteshipOrder.status);
    const waybillId =
      biteshipOrder.courier?.waybill_id || orderData.trackingNumber;

    // A booking/allocated courier is not a pickup. Do not regress delivered orders.
    if (newStatus === "SHIPPED") {
      if (preOrder) await prisma.harvestPreOrder.updateMany({
        where: { id: shipmentId, status: "PAID" },
        data: { status: "SHIPPED", shippedAt: preOrder.shippedAt || new Date(), trackingNumber: waybillId },
      });
      else await prisma.stockTransaction.updateMany({
        where: { id: shipmentId, status: "PAID" },
        data: { status: "SHIPPED", shippedAt: directSale?.shippedAt || new Date(), trackingNumber: waybillId },
      });
    }
    if (newStatus === "DELIVERED") {
      if (preOrder) await fulfillPreOrderToInventory(shipmentId);
      else await fulfillSaleToInventory(shipmentId);
    }
    if (waybillId) {
      if (preOrder) await prisma.harvestPreOrder.updateMany({ where: { id: shipmentId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, data: { trackingNumber: waybillId } });
      else await prisma.stockTransaction.updateMany({ where: { id: shipmentId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, data: { trackingNumber: waybillId } });
    }

    // Ambil data terbaru setelah sinkronisasi
    const refreshedPreOrder = preOrder
      ? await prisma.harvestPreOrder.findUnique({
          where: { id: shipmentId },
          include: {
            announcement: { include: { supplier: { select: { id: true, name: true } } } },
            florist: { select: { id: true, name: true } },
          },
        })
      : null;

    const refreshedSale = directSale
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          include: {
            stock: { include: { supplier: { select: { id: true, name: true } } } },
            florist: { select: { id: true, name: true } },
          },
        })
      : null;

    const currentOrder = refreshedPreOrder || refreshedSale || orderData;
    const courierCode = biteshipOrder.courier?.company?.toUpperCase() || currentOrder.courier || "Biteship";
    const flowerName = refreshedPreOrder
      ? refreshedPreOrder.announcement.flowerName
      : refreshedSale?.stock.name || "Bunga Segar";
    const supplierName = refreshedPreOrder
      ? refreshedPreOrder.announcement.supplier?.name
      : refreshedSale?.stock.supplier?.name || "Kebun Mitra";
    const floristName = currentOrder.florist?.name || "Florist Mitra";

    // Bangun riwayat logistik kronologis lengkap
    const rawHistory = Array.isArray(biteshipOrder.courier?.history)
      ? biteshipOrder.courier.history
      : [];

    const historyItems: Array<{
      status: string;
      note: string;
      updated_at: string;
      location?: string;
    }> = [];

    // Kembalikan riwayat autentik dari Biteship bila tersedia
    if (rawHistory.length > 0) {
      for (const h of rawHistory) {
        historyItems.push({
          status: h.status || biteshipOrder.status || "confirmed",
          note:
            h.note ||
            `Pembaruan status ${courierCode} (${h.status || biteshipOrder.status})`,
          updated_at: h.updated_at || currentOrder.createdAt.toISOString(),
        });
      }
    } else {
      // Fallback hanya ke stempel waktu database aktual (tanpa interpolasi palsu)
      if (currentOrder.deliveredAt) {
        historyItems.push({
          status: "delivered",
          note: `Paket ${flowerName} (${currentOrder.quantity} tangkai) diterima oleh ${floristName}.`,
          updated_at: currentOrder.deliveredAt.toISOString(),
          location: "Toko Florist Penerima",
        });
      }
      if (currentOrder.shippedAt) {
        historyItems.push({
          status: "picked",
          note: `Kurir ${courierCode} menjemput paket dari ${supplierName}${waybillId ? ` (Resi: ${waybillId})` : ""}.`,
          updated_at: currentOrder.shippedAt.toISOString(),
          location: "Kebun Supplier Pengirim",
        });
      }
      historyItems.push({
        status: "confirmed",
        note: `Booking kurir ${courierCode} dibuat.${waybillId ? ` Resi: ${waybillId}.` : " Menunggu penjemputan kurir."}`,
        updated_at: currentOrder.createdAt.toISOString(),
      });
    }

    historyItems.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    return NextResponse.json({
      success: true,
      data: {
        tracking: {
          status: biteshipOrder.status,
          courier: biteshipOrder.courier,
          history: historyItems,
          link: biteshipOrder.courier?.link || null,
        },
      },
    });
  } catch (error) {
    reportServerError("Error tracking Biteship shipment:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal melacak pengiriman",
      },
      { status: 500 },
    );
  }
}

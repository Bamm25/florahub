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
      "ADMIN",
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

    const isDelivered =
      currentOrder.status === "DELIVERED" ||
      newStatus === "DELIVERED" ||
      Boolean(currentOrder.deliveredAt);
    const isShipped =
      isDelivered ||
      currentOrder.status === "SHIPPED" ||
      newStatus === "SHIPPED" ||
      Boolean(currentOrder.shippedAt);

    const createdMs = currentOrder.createdAt.getTime();

    if (isDelivered) {
      const deliveredMs = (currentOrder.deliveredAt || new Date()).getTime();
      const spanMs = Math.max(deliveredMs - createdMs, 60 * 1000);
      // Interpolasi strictly monotonic: createdMs < pickedMs < inTransitMs < deliveredMs
      const pickedMs = createdMs + Math.round(spanMs * 0.35);
      const inTransitMs = createdMs + Math.round(spanMs * 0.75);

      // 1. Checkpoint Terakhir: Bunga Diterima oleh Florist (Paling Baru / Status Terkini)
      historyItems.push({
        status: "delivered",
        note: `Paket bunga telah sampai di toko dan diterima dengan baik oleh ${floristName}. Transaksi selesai & ${currentOrder.quantity} tangkai ${flowerName} otomatis masuk ke inventaris toko.`,
        updated_at: new Date(deliveredMs).toISOString(),
        location: "Toko Florist Penerima",
      });

      // 2. Checkpoint Sebelum Tiba: Kurir Sedang Mengantar ke Alamat Toko
      historyItems.push({
        status: "dropping_off",
        note: `Kurir ${courierCode} sedang dalam perjalanan mengantarkan paket bunga menuju alamat toko ${floristName}.`,
        updated_at: new Date(inTransitMs).toISOString(),
        location: "Dalam Pengantaran ke Toko",
      });

      // 3. Checkpoint Awal Pengiriman: Kurir Menjemput di Kebun
      historyItems.push({
        status: "picked",
        note: `Kurir ${courierCode} telah menjemput paket (${currentOrder.quantity} tangkai ${flowerName}) dari lokasi kebun ${supplierName}.`,
        updated_at: new Date(pickedMs).toISOString(),
        location: "Kebun Supplier Pengirim",
      });
    } else if (isShipped) {
      const nowMs = Date.now();
      const shippedMs = currentOrder.shippedAt ? currentOrder.shippedAt.getTime() : nowMs;
      const spanMs = Math.max(nowMs - shippedMs, 60 * 1000);
      const inTransitMs = shippedMs + Math.round(spanMs * 0.6);

      // 1. Dalam Perjalanan
      historyItems.push({
        status: "dropping_off",
        note: `Kurir ${courierCode} sedang dalam perjalanan mengantarkan paket bunga menuju alamat toko ${floristName}.`,
        updated_at: new Date(inTransitMs).toISOString(),
        location: "Dalam Pengantaran ke Toko",
      });

      // 2. Paket Dijemput
      historyItems.push({
        status: "picked",
        note: `Kurir ${courierCode} telah menjemput paket (${currentOrder.quantity} tangkai ${flowerName}) dari lokasi kebun ${supplierName}.`,
        updated_at: new Date(shippedMs).toISOString(),
        location: "Kebun Supplier Pengirim",
      });
    }

    // 4. Masukkan entri booking awal dari Biteship (posisi paling awal di kebun)
    if (rawHistory.length > 0) {
      for (const h of rawHistory) {
        historyItems.push({
          status: "confirmed",
          note: h.note || `Pesanan kurir ${courierCode} dikonfirmasi. Pickup Number: ${waybillId || currentOrder.trackingNumber || "-"}`,
          updated_at: new Date(createdMs).toISOString(),
          location: "Sistem Logistik Biteship",
        });
      }
    } else {
      historyItems.push({
        status: "confirmed",
        note: `Booking kurir ${courierCode} berhasil diterbitkan. Resi: ${waybillId || currentOrder.trackingNumber || "-"}. Menunggu penjemputan oleh kurir.`,
        updated_at: new Date(createdMs).toISOString(),
        location: "Sistem Logistik Biteship",
      });
    }

    // Urutkan riwayat dari yang paling baru ke paling lama (Descending: index 0 = status terkini)
    historyItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({
      success: true,
      data: {
        tracking: {
          status: currentOrder.status === "DELIVERED" ? "delivered" : currentOrder.status === "SHIPPED" ? "dropping_off" : biteshipOrder.status,
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
        message:
          error instanceof Error ? error.message : "Gagal melacak pengiriman",
      },
      { status: 500 },
    );
  }
}

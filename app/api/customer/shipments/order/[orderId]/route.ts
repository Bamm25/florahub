import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";

// Handler HTTP GET untuk mengambil informasi status pengiriman pesanan berdasarkan ID pesanan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Validasi sesi pengguna dan ambil ID pesanan dari parameter rute
    const { userId } = await requireAuth(request);
    const { orderId } = await params;

    // Ambil data pengiriman beserta relasi rincian pesanan
    const shipment = await prisma.shipment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    // Validasi keberadaan data pengiriman
    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan untuk order ini",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pesanan oleh pengguna
    if (shipment.order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan order Anda",
        },
        { status: 403 },
      );
    }

    // Sinkronkan status pengiriman terkini dari Biteship bila belum berstatus terkirim
    let currentShipment = shipment;
    if (shipment.biteshipOrderId && shipment.status !== "DELIVERED") {
      try {
        const biteshipClient = getBiteshipClient();
        const biteshipOrder = await biteshipClient.getOrder(shipment.biteshipOrderId);
        const newStatus = mapBiteshipStatus(biteshipOrder.status);
        const waybillId = biteshipOrder.courier?.waybill_id || shipment.trackingNumber;

        const STATUS_RANK: Record<string, number> = {
          PENDING: 1,
          PROCESSING: 2,
          SHIPPED: 3,
          DELIVERED: 4,
          CANCELLED: 99,
        };

        const currentRank = STATUS_RANK[shipment.status] || 0;
        const nextRank = STATUS_RANK[newStatus] || 0;
        // Hanya perbarui status jika status baru lebih lanjut dari status saat ini
        const shouldUpdateStatus = nextRank > currentRank;
        const finalStatus = shouldUpdateStatus ? newStatus : shipment.status;
        const isTrackingChanged = waybillId && waybillId !== shipment.trackingNumber;

        if (shouldUpdateStatus || isTrackingChanged) {
          currentShipment = await prisma.shipment.update({
            where: { id: shipment.id },
            data: {
              status: finalStatus,
              trackingNumber: waybillId,
              shippedAt: finalStatus === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
              deliveredAt: finalStatus === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined,
            },
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  userId: true,
                  totalAmount: true,
                  status: true,
                },
              },
            },
          });

          if (finalStatus === "SHIPPED" && shipment.order.status === "PROCESSING") {
            await prisma.order.update({ where: { id: shipment.orderId }, data: { status: "SHIPPED" } });
          }
          if (finalStatus === "DELIVERED" && shipment.order.status !== "DELIVERED") {
            await prisma.order.update({ where: { id: shipment.orderId }, data: { status: "DELIVERED" } });
          }
        }
      } catch (syncErr) {
        console.warn("[CUSTOMER_TRACKING_SYNC_WARN]", syncErr);
      }
    }

    // Kirim respons berhasil beserta data informasi pengiriman
    return NextResponse.json({
      success: true,
      message: "Informasi pengiriman berhasil diambil",
      data: { shipment: currentShipment },
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil informasi pengiriman" },
      { status: 500 },
    );
  }
}

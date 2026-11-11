import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";

// GET: Fetch shipment info untuk order by orderId
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Validate user session dan parse orderId
    const { userId } = await requireAuth(request);
    const { orderId } = await params;

    // Query shipment dengan order details
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

    // Validate shipment existence
    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan untuk order ini",
        },
        { status: 404 },
      );
    }

    // Validate order ownership
    if (shipment.order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan order Anda",
        },
        { status: 403 },
      );
    }

    // Sinkronkan data terbaru dari Biteship jika shipment otomatis dan belum delivered
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
        // Hanya update status dari Biteship jika statusnya maju, jangan downgrade status yang sudah diperbarui florist
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

    // Return response dengan shipment data
    return NextResponse.json({
      success: true,
      message: "Informasi pengiriman berhasil diambil",
      data: { shipment: currentShipment },
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil informasi pengiriman" },
      { status: 500 },
    );
  }
}

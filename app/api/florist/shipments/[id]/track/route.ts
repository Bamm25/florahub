import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import { SHIPMENT_STATUS_RANK } from "@/lib/config/domain";
import { NextRequest, NextResponse } from "next/server";

// Handler HTTP GET untuk melacak status pengiriman paket melalui Biteship API
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(req, [
      "FLORIST",
      "CUSTOMER",
      "ADMIN",
    ]);

    const { id: shipmentId } = await params;

    // Cari data pengiriman tanpa membocorkan field sensitif pengguna (seperti password)
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    floristId: true,
                    florist: {
                      select: {
                        id: true,
                        name: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: "Shipment tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak akses pemilik florist, pembeli, atau admin
    const isOwner = shipment.order.items.some(
      (item) => item.product.florist.id === userId,
    );
    const isCustomer = shipment.order.userId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isCustomer && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke shipment ini",
        },
        { status: 403 },
      );
    }

    if (!shipment.biteshipOrderId) {
      return NextResponse.json({
        success: true,
        message: "Shipment ini dibuat manual (tanpa Biteship)",
        data: {
          shipment,
          tracking: null,
          source: "database",
        },
      });
    }

    const biteshipClient = getBiteshipClient();
    const biteshipOrder = await biteshipClient.getOrder(shipment.biteshipOrderId);
    const newStatus = mapBiteshipStatus(biteshipOrder.status);
    const waybillId = biteshipOrder.courier?.waybill_id || shipment.trackingNumber;

    const currentRank = SHIPMENT_STATUS_RANK[shipment.status] || 0;
    const nextRank = SHIPMENT_STATUS_RANK[newStatus] || 0;
    const shouldUpdateStatus = nextRank > currentRank;
    const finalStatus = shouldUpdateStatus ? newStatus : shipment.status;
    const isTrackingChanged = waybillId && waybillId !== shipment.trackingNumber;

    if (shouldUpdateStatus || isTrackingChanged) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: finalStatus,
          trackingNumber: waybillId,
          shippedAt:
            finalStatus === "SHIPPED" && !shipment.shippedAt
              ? new Date()
              : undefined,
          deliveredAt:
            finalStatus === "DELIVERED" && !shipment.deliveredAt
              ? new Date()
              : undefined,
        },
      });
    }

    if (finalStatus === "SHIPPED" && shipment.order.status === "PROCESSING") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "SHIPPED" },
      });

      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Dalam Pengiriman",
          message: `Pesanan #${shipment.order.orderNumber} telah dikirim${waybillId ? ` dengan nomor resi ${waybillId}` : ""}`,
        },
      });
    }

    if (newStatus === "DELIVERED" && shipment.order.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });

      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Telah Sampai",
          message: `Pesanan #${shipment.order.orderNumber} telah diterima. Terima kasih!`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tracking berhasil diambil",
      data: {
        shipment: {
          ...shipment,
          status: finalStatus,
          trackingNumber: waybillId,
        },
        tracking: {
          status: biteshipOrder.status,
          history: biteshipOrder.courier?.history || [],
          courier: biteshipOrder.courier,
          link: biteshipOrder.courier?.link || null,
        },
        source: "biteship",
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[TRACK_SHIPMENT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal melakukan tracking pengiriman",
      },
      { status: 500 },
    );
  }
}

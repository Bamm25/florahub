// Endpoint untuk tracking shipment via Biteship API (update status otomatis)
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: shipmentId } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: {
                  include: {
                    florist: true,
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
        { status: 404 }
      );
    }

    // Validate access: florist owner atau customer
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const floristId = shipment.order.items[0]?.product?.florist?.id;
    const isOwner = floristId === userId;
    const isCustomer = shipment.order.userId === userId;

    if (!isOwner && !isCustomer && userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke shipment ini" },
        { status: 403 }
      );
    }

    // Jika tidak ada biteshipOrderId, return data shipment dari database saja
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

    // Fetch tracking dan status order dari Biteship
    const biteshipClient = getBiteshipClient();
    const biteshipOrder = await biteshipClient.getOrder(shipment.biteshipOrderId);
    const newStatus = mapBiteshipStatus(biteshipOrder.status);
    const waybillId = biteshipOrder.courier?.waybill_id || shipment.trackingNumber;

    // Update status, resi, shippedAt, deliveredAt di database jika berbeda
    const isStatusChanged = newStatus !== shipment.status;
    const isTrackingChanged = waybillId !== shipment.trackingNumber;

    if (isStatusChanged || isTrackingChanged) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: newStatus,
          trackingNumber: waybillId,
          shippedAt: newStatus === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
          deliveredAt: newStatus === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined,
        },
      });
    }

    // Update order status jika shipment shipped
    if (newStatus === "SHIPPED" && shipment.order.status === "PROCESSING") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "SHIPPED" },
      });

      // Create notification untuk customer
      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Dalam Pengiriman",
          message: `Pesanan #${shipment.order.orderNumber} telah dikirim${waybillId ? ` dengan nomor resi ${waybillId}` : ""}`,
        },
      });
    }

    // Update order status jika shipment delivered
    if (newStatus === "DELIVERED" && shipment.order.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });

      // Create notification untuk customer
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
          status: newStatus,
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
  } catch (error: any) {
    console.error("[TRACK_SHIPMENT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal melakukan tracking",
      },
      { status: 500 }
    );
  }
}

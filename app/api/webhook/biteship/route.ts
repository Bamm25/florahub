import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapBiteshipStatus } from "@/lib/biteship";

// Webhook receiver untuk update otomatis status pengiriman dan nomor resi dari Biteship
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;
    const biteshipOrderId = body.order_id;

    // Tangani event order.status dan order.waybill_id dari Biteship
    if (event && !["order.status", "order.waybill_id", "order.price"].includes(event)) {
      return NextResponse.json(
        { success: true, message: `Event ${event} diabaikan` },
        { status: 200 }
      );
    }

    if (!biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan dalam payload webhook" },
        { status: 400 }
      );
    }

    // Cari data shipment berdasarkan Biteship order ID
    const shipment = await prisma.shipment.findFirst({
      where: { biteshipOrderId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: true, message: `Shipment untuk order ${biteshipOrderId} tidak ditemukan di database` },
        { status: 200 }
      );
    }

    // Ambil waybill dan status dari payload
    const waybillId = body.courier_waybill_id || shipment.trackingNumber;
    const rawStatus = body.status || "";
    const newStatus = rawStatus ? mapBiteshipStatus(rawStatus) : shipment.status;

    // Perbarui data shipment di database
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus,
        trackingNumber: waybillId,
        shippedAt: newStatus === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
        deliveredAt: newStatus === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined,
      },
    });

    // Update status order jika pengiriman mulai berjalan
    if (newStatus === "SHIPPED" && shipment.order.status === "PROCESSING") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "SHIPPED" },
      });

      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Dalam Pengiriman",
          message: `Pesanan #${shipment.order.orderNumber} sedang dikirim${waybillId ? ` dengan nomor resi ${waybillId}` : ""}`,
        },
      });
    }

    // Update status order jika paket telah sampai di tujuan
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
      message: `Webhook ${event} berhasil diproses`,
      data: {
        shipmentId: shipment.id,
        status: newStatus,
        trackingNumber: waybillId,
      },
    });
  } catch (error: any) {
    console.error("[BITESHIP_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses webhook Biteship" },
      { status: 500 }
    );
  }
}

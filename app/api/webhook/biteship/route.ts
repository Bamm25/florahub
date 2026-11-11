import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapBiteshipStatus } from "@/lib/biteship";

// Handler HTTP POST webhook untuk menerima pembaruan status dan nomor resi dari Biteship
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;
    const biteshipOrderId = body.order_id;

    // Filter tipe event Biteship yang relevan untuk diproses
    if (event && !["order.status", "order.waybill_id", "order.price"].includes(event)) {
      return NextResponse.json(
        { success: true, message: `Event ${event} diabaikan` },
        { status: 200 }
      );
    }

    // Validasi keberadaan ID pesanan pada payload webhook
    if (!biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan dalam payload webhook" },
        { status: 400 }
      );
    }

    // Cari data pengiriman berdasarkan ID pesanan Biteship
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

    // Ambil nomor resi dan tentukan pemetaan status pengiriman baru
    const waybillId = body.courier_waybill_id || shipment.trackingNumber;
    const rawStatus = body.status || "";
    const newStatus = rawStatus ? mapBiteshipStatus(rawStatus) : shipment.status;

    // Perbarui status pengiriman dan catatan waktu di basis data
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus,
        trackingNumber: waybillId,
        shippedAt: newStatus === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
        deliveredAt: newStatus === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined,
      },
    });

    // Perbarui status pesanan menjadi dikirim dan beri tahu pembeli
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

    // Perbarui status pesanan menjadi diterima saat paket sampai
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

    // Kirim respons berhasil atas pemrosesan data webhook
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
    // Tangani kesalahan saat memproses data webhook Biteship
    console.error("[BITESHIP_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses webhook Biteship" },
      { status: 500 }
    );
  }
}

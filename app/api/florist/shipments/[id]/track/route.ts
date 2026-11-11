// Endpoint pelacakan pengiriman melalui Biteship API
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";

// Handler HTTP GET untuk melacak status pengiriman paket melalui Biteship API
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autentikasi sesi pengguna
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ambil parameter ID pengiriman dari URL
    const { id: shipmentId } = await params;

    // Cari data pengiriman beserta relasi order, pembeli, dan produk
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

    // Validasi keberadaan data pengiriman
    if (!shipment) {
      return NextResponse.json(
        { success: false, message: "Shipment tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi hak akses pemilik florist, pembeli, atau admin
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

    // Kembalikan data lokal database jika tidak terhubung ke Biteship
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

    // Ambil data status dan riwayat pelacakan dari Biteship
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
    const shouldUpdateStatus = nextRank > currentRank;
    const finalStatus = shouldUpdateStatus ? newStatus : shipment.status;
    const isTrackingChanged = waybillId && waybillId !== shipment.trackingNumber;

    if (shouldUpdateStatus || isTrackingChanged) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: finalStatus,
          trackingNumber: waybillId,
          shippedAt: finalStatus === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
          deliveredAt: finalStatus === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined,
        },
      });
    }

    // Perbarui status pesanan menjadi SHIPPED jika pengiriman dikirim
    if (finalStatus === "SHIPPED" && shipment.order.status === "PROCESSING") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "SHIPPED" },
      });

      // Kirim notifikasi pengiriman pesanan ke pembeli
      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Dalam Pengiriman",
          message: `Pesanan #${shipment.order.orderNumber} telah dikirim${waybillId ? ` dengan nomor resi ${waybillId}` : ""}`,
        },
      });
    }

    // Perbarui status pesanan menjadi DELIVERED jika paket sampai
    if (newStatus === "DELIVERED" && shipment.order.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });

      // Kirim notifikasi penerimaan pesanan ke pembeli
      await prisma.notification.create({
        data: {
          userId: shipment.order.userId,
          type: "SHIPMENT_UPDATE",
          title: "Pesanan Telah Sampai",
          message: `Pesanan #${shipment.order.orderNumber} telah diterima. Terima kasih!`,
        },
      });
    }

    // Kembalikan respon sukses pelacakan pengiriman
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
    // Tangani error internal server
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

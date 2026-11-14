import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { fulfillSaleToInventory } from "@/lib/supply-chain/fulfill-inventory";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP PATCH untuk menandai pasokan bunga langsung telah diterima oleh florist
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id: transactionId } = await params;

    const sale = await prisma.stockTransaction.findUnique({
      where: { id: transactionId },
      include: {
        stock: true,
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, message: "Transaksi pembelian pasokan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && sale.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Transaksi ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    if (!sale.biteshipOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengiriman belum dibuat melalui Biteship",
        },
        { status: 400 },
      );
    }

    if (sale.status === "DELIVERED") {
      return NextResponse.json({
        success: true,
        message: "Pesanan sudah berstatus diterima",
        data: { transaction: sale },
      });
    }

    // Eksekusi pemenuhan inventaris florist
    const credited = await fulfillSaleToInventory(transactionId);
    if (!credited) {
      return NextResponse.json(
        { success: false, message: "Pesanan sudah diterima atau status tidak memenuhi syarat" },
        { status: 409 },
      );
    }

    const updatedSale = await prisma.stockTransaction.findUnique({
      where: { id: transactionId },
      include: {
        stock: true,
        florist: { select: { id: true, name: true, email: true } },
      },
    });

    // Kirim notifikasi ke supplier
    await prisma.notification.create({
      data: {
        userId: sale.stock.supplierId,
        title: "Pasokan Bunga Telah Diterima Florist!",
        message: `Florist ${sale.florist.name} telah mengonfirmasi penerimaan ${sale.quantity} tangkai ${sale.stock.name}. Transaksi selesai.`,
        type: "SHIPMENT_UPDATE",
        link: `/supplier/shipments`,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bunga berhasil dikonfirmasi diterima. Stok masuk ke inventaris Anda.",
      data: { transaction: updatedSale },
    });
  } catch (error) {
    reportServerError("Error receiving direct sale shipment:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengonfirmasi penerimaan bunga",
      },
      { status: 500 },
    );
  }
}

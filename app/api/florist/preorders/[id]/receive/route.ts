import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { fulfillPreOrderToInventory } from "@/lib/supply-chain/fulfill-inventory";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP PATCH untuk menandai bunga pre-order telah diterima oleh florist
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id: preOrderId } = await params;

    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: preOrderId },
      include: {
        announcement: true,
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!preOrder) {
      return NextResponse.json(
        { success: false, message: "Pre-order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && preOrder.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Pre-order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    if (!["PAID", "SHIPPED"].includes(preOrder.status) || !preOrder.biteshipOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: `Konfirmasi penerimaan hanya dapat dilakukan setelah pengiriman dibuat. Status saat ini: ${preOrder.status}`,
        },
        { status: 400 },
      );
    }

    // The helper claims SHIPPED -> DELIVERED and credits inventory in one transaction.
    const credited = await fulfillPreOrderToInventory(preOrderId);
    if (!credited) {
      return NextResponse.json({ success: false, message: "Pesanan sudah diterima" }, { status: 409 });
    }
    const updatedPreOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: preOrderId },
      include: { announcement: true, florist: { select: { id: true, name: true, email: true } } },
    });

    // Kirim notifikasi ke supplier bahwa pesanan telah diterima dengan selamat
    await prisma.notification.create({
      data: {
        userId: preOrder.announcement.supplierId,
        title: "Bunga Telah Diterima Florist!",
        message: `Florist ${preOrder.florist.name} telah mengonfirmasi penerimaan ${preOrder.quantity} tangkai ${preOrder.announcement.flowerName}. Seluruh alur pre-order telah selesai.`,
        type: "SHIPMENT_UPDATE",
        link: `/supplier/harvest-announcements`,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Bunga berhasil dikonfirmasi diterima. Transaksi pre-order selesai.",
      data: { preOrder: updatedPreOrder },
    });
  } catch (error) {
    console.error("Error receiving pre-order:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengonfirmasi penerimaan pre-order",
      },
      { status: 500 },
    );
  }
}

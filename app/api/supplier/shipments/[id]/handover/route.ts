import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { safeRevalidatePaths } from "@/lib/revalidate-safe";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP POST untuk konfirmasi penyerahan paket B2B oleh supplier ke kurir (PAID -> SHIPPED)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const { id: shipmentId } = await params;

    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      include: {
        announcement: { select: { supplierId: true, flowerName: true } },
      },
    });

    const directSale = !preOrder
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          include: {
            stock: { select: { supplierId: true, name: true } },
          },
        })
      : null;

    const record = preOrder || directSale;
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Pengiriman tidak ditemukan" },
        { status: 404 },
      );
    }

    const supplierId = preOrder
      ? preOrder.announcement.supplierId
      : directSale?.stock.supplierId;

    if (supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke pengiriman ini",
        },
        { status: 403 },
      );
    }

    if (!record.biteshipOrderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Terbitkan resi pengiriman terlebih dahulu sebelum menyerahkan paket ke kurir",
        },
        { status: 400 },
      );
    }

    if (record.status === "SHIPPED") {
      return NextResponse.json({
        success: true,
        message: "Paket sudah berstatus dalam pengiriman",
        data: {
          status: "SHIPPED",
          shippedAt: record.shippedAt?.toISOString(),
        },
      });
    }

    if (record.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya pesanan lunas yang siap diserahkan ke kurir",
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const shippedAt = record.shippedAt || now;
    const transaction = preOrder
      ? await prisma.harvestPreOrder.updateMany({
          where: {
            id: shipmentId,
            status: "PAID",
            biteshipOrderId: { not: null },
          },
          data: { status: "SHIPPED", shippedAt },
        })
      : await prisma.stockTransaction.updateMany({
          where: {
            id: shipmentId,
            status: "PAID",
            biteshipOrderId: { not: null },
          },
          data: { status: "SHIPPED", shippedAt },
        });

    if (transaction.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status pesanan telah berubah. Muat ulang sebelum mencoba lagi.",
        },
        { status: 409 },
      );
    }

    const flowerName = preOrder
      ? preOrder.announcement.flowerName
      : directSale?.stock.name || "bunga";

    await prisma.notification.create({
      data: {
        userId: record.floristId,
        title: "Paket Bunga Diserahkan ke Kurir",
        message: `Supplier telah menyerahkan pesanan ${record.quantity} tangkai ${flowerName} ke kurir ${record.courier || "ekspedisi"}. Paket sedang menuju toko Anda.`,
        type: "SHIPMENT_UPDATE",
        link: preOrder ? "/florist/harvest-plans" : "/florist/supplier-stocks",
        isRead: false,
      },
    });

    safeRevalidatePaths([
      "/supplier/dashboard",
      "/supplier/shipments",
      "/supplier/sales",
      "/supplier/harvest-announcements",
      "/florist/harvest-plans",
      "/florist/supplier-stocks",
    ]);

    return NextResponse.json({
      success: true,
      message: "Paket berhasil dikonfirmasi diserahkan ke kurir",
      data: {
        status: "SHIPPED",
        shippedAt: shippedAt.toISOString(),
      },
    });
  } catch (error) {
    reportServerError("Error confirming supplier handover:", error);
    if (error instanceof NextResponse) return error;
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui status penyerahan ke kurir",
      },
      { status: 500 },
    );
  }
}

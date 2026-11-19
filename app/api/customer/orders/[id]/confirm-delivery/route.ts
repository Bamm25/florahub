import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk konfirmasi penerimaan pesanan oleh pelanggan (SHIPPED -> DELIVERED)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        shipment: {
          select: { id: true, status: true, shippedAt: true },
        },
        items: {
          take: 1,
          select: {
            product: {
              select: { floristId: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Order ini bukan milik Anda" },
        { status: 403 },
      );
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "Pesanan sudah dikonfirmasi diterima" },
        { status: 400 },
      );
    }

    if (order.status !== "SHIPPED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hanya pesanan yang sedang dikirim (SHIPPED) yang dapat dikonfirmasi diterima",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const confirmed = await prisma.$transaction(async (tx) => {
      // Transisi kondisional atomik mencegah double confirmation & notifikasi ganda
      const transitioned = await tx.order.updateMany({
        where: { id, userId, status: "SHIPPED" },
        data: { status: "DELIVERED" },
      });

      if (transitioned.count === 0) {
        return false;
      }

      if (
        order.shipment &&
        order.shipment.status !== "DELIVERED" &&
        order.shipment.status !== "CANCELLED"
      ) {
        await tx.shipment.update({
          where: { id: order.shipment.id },
          data: {
            status: "DELIVERED",
            deliveredAt: now,
            shippedAt: order.shipment.shippedAt ?? now,
          },
        });
      }

      const floristId = order.items[0]?.product.floristId;
      if (floristId) {
        await tx.notification.create({
          data: {
            userId: floristId,
            title: "Pesanan Diterima Pembeli",
            message: `Pesanan #${order.orderNumber} telah dikonfirmasi diterima oleh pembeli.`,
            type: "SHIPMENT_UPDATE",
            link: `/florist/orders/${order.id}`,
            isRead: false,
          },
        });
      }

      return true;
    });

    if (!confirmed) {
      return NextResponse.json(
        {
          success: false,
          message: "Status pesanan telah berubah. Muat ulang halaman.",
        },
        { status: 409 },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "Order",
      entityId: id,
      oldValue: { status: "SHIPPED" },
      newValue: { status: "DELIVERED", confirmedBy: "CUSTOMER" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Pesanan dikonfirmasi telah diterima",
      data: {
        orderId: id,
        status: "DELIVERED",
        deliveredAt: now.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[CONFIRM DELIVERY ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengonfirmasi penerimaan pesanan" },
      { status: 500 },
    );
  }
}

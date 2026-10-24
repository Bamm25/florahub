import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { HarvestPreOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id: preOrderId } = await params;
    const existingPreOrder = await prisma.harvestPreOrder.findUnique({
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

    if (!existingPreOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Pre-order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (
      userRole === "SUPPLIER" &&
      existingPreOrder.announcement.supplierId !== userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak memiliki akses untuk mengubah pre-order ini",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { status, cancelReason } = body;

    const validStatuses: HarvestPreOrderStatus[] = [
      "CONFIRMED",
      "CANCELLED",
      "PENDING",
    ];

    if (!status || !validStatuses.includes(status as HarvestPreOrderStatus)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status tidak valid. Pilih antara: CONFIRMED, CANCELLED, atau PENDING",
        },
        { status: 400 },
      );
    }

    if (
      existingPreOrder.status === "CONFIRMED" ||
      existingPreOrder.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Pre-order dengan status ${existingPreOrder.status} tidak dapat diubah lagi`,
        },
        { status: 400 },
      );
    }

    if (status === "CANCELLED") {
      if (!cancelReason || cancelReason.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Alasan pembatalan (cancelReason) wajib diisi saat membatalkan pre-order",
          },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const updatedPreOrder = await prisma.harvestPreOrder.update({
      where: { id: preOrderId },
      data: {
        status: status as HarvestPreOrderStatus,
        confirmedAt: status === "CONFIRMED" ? now : null,
        cancelledAt: status === "CANCELLED" ? now : null,
        cancelReason:
          status === "CANCELLED"
            ? cancelReason.trim()
            : existingPreOrder.cancelReason,
      },
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

    let notificationTitle = "";
    let notificationMessage = "";

    const supplier = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (status === "CONFIRMED") {
      notificationTitle = "Pre-Order Anda Dikonfirmasi!";
      notificationMessage = `Supplier ${supplier?.name || "Petani"} telah menerima pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName}.`;
    } else if (status === "CANCELLED") {
      notificationTitle = "Pre-Order Dibatalkan Supplier!";
      notificationMessage = `Pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName} dibatalkan. Alasan: ${cancelReason.trim()}`;
    }

    if (notificationTitle && notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: existingPreOrder.floristId,
          title: notificationTitle,
          message: notificationMessage,
          type: "PREORDER_CONFIRMED",
          link: `/florist/preorders`,
          isRead: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Status pre-order berhasil diubah menjadi ${status}`,
      data: { preOrder: updatedPreOrder },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

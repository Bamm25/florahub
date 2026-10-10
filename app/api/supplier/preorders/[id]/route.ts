import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HarvestPreOrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya supplier atau admin yang dapat mengubah status pre-order",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
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

    if (status === "CONFIRMED") {
      notificationTitle = "Pre-Order Anda Dikonfirmasi!";
      notificationMessage = `Supplier ${(session.user as any)?.name || "Petani"} telah menerima pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName}.`;
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
    console.error("Error updating preorder status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

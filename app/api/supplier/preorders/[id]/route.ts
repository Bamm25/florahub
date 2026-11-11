import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { HarvestPreOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { updatePreorderSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute URL
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP PATCH untuk memperbarui status pre-order panen oleh supplier
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter ID pre-order dari URL
    const { id: preOrderId } = await params;
    // Cari data pre-order beserta pengumuman dan informasi florist
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

    // Validasi keberadaan data pre-order
    if (!existingPreOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Pre-order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pengumuman panen oleh supplier
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

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updatePreorderSchema.parse(body);
    const { status, cancelReason } = validated;

    // Validasi status pre-order yang sudah final tidak dapat diubah lagi
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

    // Validasi alasan pembatalan saat membatalkan pre-order
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

    // Perbarui status pre-order di database
    const now = new Date();
    const updatedPreOrder = await prisma.harvestPreOrder.update({
      where: { id: preOrderId },
      data: {
        status: status as HarvestPreOrderStatus,
        confirmedAt: status === "CONFIRMED" ? now : null,
        cancelledAt: status === "CANCELLED" ? now : null,
        cancelReason:
          status === "CANCELLED"
            ? cancelReason?.trim() || ""
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

    // Cari informasi nama supplier untuk notifikasi
    const supplier = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Susun pesan notifikasi untuk florist sesuai perubahan status
    if (status === "CONFIRMED") {
      notificationTitle = "Pre-Order Anda Dikonfirmasi!";
      notificationMessage = `Supplier ${supplier?.name || "Petani"} telah menerima pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName}.`;
    } else if (status === "CANCELLED") {
      notificationTitle = "Pre-Order Dibatalkan Supplier!";
      notificationMessage = `Pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName} dibatalkan${cancelReason ? `. Alasan: ${cancelReason.trim()}` : ""}.`;
    }

    // Buat notifikasi baru untuk florist jika ada perubahan status
    if (notificationTitle && notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: existingPreOrder.floristId,
          title: notificationTitle,
          message: `${notificationMessage}${cancelReason ? ` (Alasan: ${cancelReason.trim()})` : ""}`,
          type: "PREORDER_CONFIRMED",
          link: `/florist/preorders`,
          isRead: false,
        },
      });
    }

    // Kembalikan respon sukses pembaruan status pre-order
    return NextResponse.json({
      success: true,
      message: `Status pre-order berhasil diubah menjadi ${status}`,
      data: { preOrder: updatedPreOrder },
    });
  } catch (error) {
    // Tangani error validasi Zod, otorisasi, atau internal server error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
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

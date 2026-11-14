import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { harvestDayEndWib } from "@/lib/supply-chain/midtrans-payments";
import { HarvestPreOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { updatePreorderSchema } from "@/lib/validations/schemas";
import { formatRupiah, formatDate } from "@/lib/utils/formatters";
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

    // Validasi status pre-order: hanya status PENDING yang dapat diubah oleh endpoint ini
    if (existingPreOrder.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Pre-order dengan status ${existingPreOrder.status} tidak dapat diubah lagi melalui aksi ini`,
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
    const isConfirming = status === "CONFIRMED";
    if (isConfirming && now.getTime() + 3 * 24 * 60 * 60 * 1000 > harvestDayEndWib(existingPreOrder.announcement.harvestDate).getTime()) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat menyetujui: batas DP 3 hari melampaui hari panen. Perbarui jadwal panen sebelum menerima pesanan." },
        { status: 409 },
      );
    }

    // Hitung rincian DP 50% dan tenggat waktu 3 hari saat konfirmasi
    let updateData: any = {
      status: status as HarvestPreOrderStatus,
      confirmedAt: isConfirming ? now : null,
      cancelledAt: status === "CANCELLED" ? now : null,
      cancelReason:
        status === "CANCELLED"
          ? cancelReason?.trim() || ""
          : existingPreOrder.cancelReason,
    };

    if (isConfirming) {
      const depositAmount = Math.round(existingPreOrder.totalPrice * 0.5);
      const remainingAmount = existingPreOrder.totalPrice - depositAmount;
      const depositDeadline = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      ); // 3 hari kalender
      const finalDeadline = harvestDayEndWib(existingPreOrder.announcement.harvestDate);
      if (!existingPreOrder.announcement.isActive || now > finalDeadline) {
        return NextResponse.json(
          { success: false, message: "Pengumuman tidak aktif atau tanggal panen sudah lewat; pre-order tidak dapat disetujui." },
          { status: 409 },
        );
      }

      updateData = {
        ...updateData,
        depositAmount,
        remainingAmount,
        depositDeadline,
        finalDeadline,
      };
    }

    // Cegah persetujuan melebihi kapasitas panen. estimatedQuantity adalah total,
    // bukan stok yang didecrement: pesanan aktif dihitung termasuk yang sudah DP.
    if (isConfirming) {
      const active = await prisma.harvestPreOrder.aggregate({
        where: {
          announcementId: existingPreOrder.announcementId,
          status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] },
        },
        _sum: { quantity: true },
      });
      if ((active._sum.quantity || 0) > existingPreOrder.announcement.estimatedQuantity) {
        return NextResponse.json(
          { success: false, message: "Kapasitas panen tidak mencukupi untuk menyetujui pre-order ini." },
          { status: 409 },
        );
      }
    }

    const updatedPreOrder = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "HarvestAnnouncement" WHERE id = ${existingPreOrder.announcementId} FOR UPDATE`;
      if (isConfirming) {
        const latest = await tx.harvestAnnouncement.findUnique({ where: { id: existingPreOrder.announcementId } });
        const active = await tx.harvestPreOrder.aggregate({
          where: {
            announcementId: existingPreOrder.announcementId,
            status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] },
          },
          _sum: { quantity: true },
        });
        if (!latest?.isActive || (active._sum.quantity ?? 0) > latest.estimatedQuantity) {
          return null;
        }
      }
      return tx.harvestPreOrder.update({
        where: { id: preOrderId, status: "PENDING" },
        data: updateData,
        include: {
          announcement: true,
          florist: { select: { id: true, name: true, email: true } },
        },
      });
    });
    if (!updatedPreOrder) {
      return NextResponse.json({ success: false, message: "Alokasi panen tidak tersedia; muat ulang pesanan." }, { status: 409 });
    }

    let notificationTitle = "";
    let notificationMessage = "";

    // Cari informasi nama supplier untuk notifikasi
    const supplier = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Susun pesan notifikasi informatif untuk florist sesuai perubahan status
    if (isConfirming) {
      const dpRupiah = formatRupiah(updatedPreOrder.depositAmount || 0);
      const deadlineStr = formatDate(updatedPreOrder.depositDeadline);
      notificationTitle = "Pre-Order Panen Dikonfirmasi — Wajib Bayar DP";
      notificationMessage = `Supplier ${supplier?.name || "Petani"} telah menyetujui pesanan Anda (${updatedPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName}). Silakan bayar DP 50% (${dpRupiah}) paling lambat ${deadlineStr}.`;
    } else if (status === "CANCELLED") {
      notificationTitle = "Pre-Order Dibatalkan Supplier";
      notificationMessage = `Pre-order Anda untuk ${existingPreOrder.quantity} tangkai ${existingPreOrder.announcement.flowerName} dibatalkan oleh supplier${cancelReason ? `. Alasan: ${cancelReason.trim()}` : ""}.`;
    }

    // Buat notifikasi baru untuk florist jika ada perubahan status
    if (notificationTitle && notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: existingPreOrder.floristId,
          title: notificationTitle,
          message: notificationMessage,
          type: "PREORDER_CONFIRMED",
          link: `/florist/harvest-plans`,
          isRead: false,
        },
      });
    }

    // Kembalikan respon sukses pembaruan status pre-order
    return NextResponse.json({
      success: true,
      message: isConfirming
        ? `Pre-order dikonfirmasi. Florist wajib membayar DP 50% (${formatRupiah(updatedPreOrder.depositAmount || 0)}) dalam 3 hari.`
        : `Pre-order berhasil dibatalkan.`,
      data: { preOrder: updatedPreOrder },
    });
  } catch (error) {
    console.error("Error in PATCH /api/supplier/preorders/[id]:", error);
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
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

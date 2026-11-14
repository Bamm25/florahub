import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { harvestDayEndWib } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";
import { updateHarvestAnnouncementSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute URL
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk mengambil detail pengumuman panen beserta data pemesanan
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Ambil parameter ID pengumuman dari URL
    const { id: announcementId } = await params;

    // Cari data pengumuman panen beserta supplier dan daftar pre-order
    const announcement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        preOrders: {
          include: {
            florist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Validasi keberadaan data pengumuman panen
    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Kembalikan respon sukses data detail pengumuman panen
    return NextResponse.json({
      success: true,
      message: "Detail pengumuman panen berhasil diambil",
      data: { announcement },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
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

// Handler HTTP PUT untuk memperbarui data pengumuman panen
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter ID pengumuman dari URL
    const { id: announcementId } = await params;
    // Cari data pengumuman panen eksisting di database
    const existingAnnouncement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
    });

    // Validasi keberadaan data pengumuman panen
    if (!existingAnnouncement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pengumuman panen oleh supplier
    if (userRole === "SUPPLIER" && existingAnnouncement.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak memiliki akses untuk mengubah pengumuman panen milik supplier lain",
        },
        { status: 403 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateHarvestAnnouncementSchema.parse(body);
    const {
      flowerName,
      variety,
      estimatedQuantity,
      pricePerUnit,
      harvestDate,
      description,
      location,
      image,
      isActive,
    } = validated;

    // Konversi format tanggal panen jika disertakan
    let parsedHarvestDate = existingAnnouncement.harvestDate;
    if (harvestDate !== undefined) {
      parsedHarvestDate = new Date(harvestDate);
    }

    if (harvestDate !== undefined && harvestDayEndWib(parsedHarvestDate).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, message: "Jadwal panen harus lebih dari 3 hari ke depan agar DP dapat dibayar tepat waktu." }, { status: 400 });
    }

    // Harga dan tanggal panen terkunci setelah ada pemesan agar kontrak DP/pelunasan tetap sah.
    if (pricePerUnit !== undefined || harvestDate !== undefined) {
      const relatedOrders = await prisma.harvestPreOrder.count({
        where: { announcementId },
      });
      if (relatedOrders > 0) {
        return NextResponse.json(
          { success: false, message: "Harga dan tanggal panen tidak dapat diubah setelah ada pre-order." },
          { status: 409 },
        );
      }
    }

    // Total kapasitas tidak boleh diturunkan di bawah alokasi pesanan aktif.
    if (estimatedQuantity !== undefined) {
      const reserved = await prisma.harvestPreOrder.aggregate({
        where: {
          announcementId,
          status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] },
        },
        _sum: { quantity: true },
      });
      if (estimatedQuantity < (reserved._sum.quantity ?? 0)) {
        return NextResponse.json(
          { success: false, message: `Kapasitas tidak boleh kurang dari ${(reserved._sum.quantity ?? 0)} tangkai yang sudah dialokasikan.` },
          { status: 409 },
        );
      }
    }

    // Kunci baris pengumuman sebelum membaca kuota dan mengubahnya.
    // Lock yang sama digunakan saat florist mengajukan pesanan.
    const updatedAnnouncement = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "HarvestAnnouncement" WHERE id = ${announcementId} FOR UPDATE`;
      const latest = await tx.harvestAnnouncement.findUnique({ where: { id: announcementId } });
      if (!latest || (userRole === "SUPPLIER" && latest.supplierId !== userId)) return null;
      if (pricePerUnit !== undefined || harvestDate !== undefined) {
        const totalOrders = await tx.harvestPreOrder.count({ where: { announcementId } });
        if (totalOrders > 0) return null;
      }
      if (estimatedQuantity !== undefined) {
        const active = await tx.harvestPreOrder.aggregate({
          where: { announcementId, status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] } },
          _sum: { quantity: true },
        });
        if (estimatedQuantity < (active._sum.quantity ?? 0)) return null;
      }
      return tx.harvestAnnouncement.update({
        where: { id: announcementId },
        data: {
        flowerName:
          flowerName !== undefined
            ? flowerName.trim()
            : existingAnnouncement.flowerName,
        variety:
          variety !== undefined
            ? variety
              ? variety.trim()
              : null
            : existingAnnouncement.variety,
        estimatedQuantity:
          estimatedQuantity !== undefined
            ? Math.round(estimatedQuantity)
            : existingAnnouncement.estimatedQuantity,
        pricePerUnit:
          pricePerUnit !== undefined
            ? Math.round(pricePerUnit)
            : existingAnnouncement.pricePerUnit,
        harvestDate: parsedHarvestDate,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : existingAnnouncement.description,
        location:
          location !== undefined
            ? location
              ? location.trim()
              : null
            : existingAnnouncement.location,
        image:
          image !== undefined
            ? image
              ? image.trim()
              : null
            : existingAnnouncement.image,
        isActive:
          isActive !== undefined
            ? Boolean(isActive)
            : existingAnnouncement.isActive,
      },
      });
    });
    if (!updatedAnnouncement) {
      return NextResponse.json({ success: false, message: "Pengumuman berubah atau kapasitas sedang dipesan. Muat ulang lalu coba lagi." }, { status: 409 });
    }

    // Kembalikan respon sukses pembaruan pengumuman panen
    return NextResponse.json({
      success: true,
      message: "Pengumuman panen berhasil diperbarui",
      data: {
        announcement: updatedAnnouncement,
      },
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

// Handler HTTP DELETE untuk menghapus data pengumuman panen
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter ID pengumuman dari URL
    const { id: announcementId } = await params;
    // Cari data pengumuman panen eksisting di database
    const existingAnnouncement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
    });

    // Validasi keberadaan data pengumuman panen
    if (!existingAnnouncement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pengumuman panen oleh supplier
    if (userRole === "SUPPLIER" && existingAnnouncement.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak memiliki akses untuk mengubah pengumuman panen milik supplier lain",
        },
        { status: 403 },
      );
    }

    const relatedOrders = await prisma.harvestPreOrder.count({
      where: { announcementId },
    });
    if (relatedOrders > 0) {
      return NextResponse.json(
        { success: false, message: "Pengumuman dengan pre-order tidak dapat dihapus karena riwayat transaksi harus tetap tercatat. Nonaktifkan pengumuman sebagai gantinya." },
        { status: 409 },
      );
    }

    // Hapus hanya pengumuman yang belum pernah dipesan
    await prisma.harvestAnnouncement.delete({
      where: { id: announcementId },
    });

    // Kembalikan respon sukses penghapusan pengumuman panen
    return NextResponse.json({
      success: true,
      message: "Pengumuman panen berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
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

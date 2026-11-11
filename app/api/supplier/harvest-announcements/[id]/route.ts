import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
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

    // Perbarui data pengumuman panen di database
    const updatedAnnouncement = await prisma.harvestAnnouncement.update({
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

    // Hapus data pengumuman panen dari database
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

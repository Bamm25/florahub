import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { createHarvestAnnouncementSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar pengumuman panen
export async function GET(request: Request) {
  try {
    // Ambil parameter filter dan paginasi dari query string
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const activeOnly = searchParams.get("activeOnly");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    // Susun kondisi filter pengumuman panen
    const whereClause: Prisma.HarvestAnnouncementWhereInput = {};

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    // Filter hanya pengumuman aktif dengan tanggal panen mendatang jika diminta
    if (activeOnly === "true") {
      whereClause.isActive = true;
      whereClause.harvestDate = {
        gte: new Date(),
      };
    }

    // Ambil daftar pengumuman panen dan total data secara paralel
    const [announcements, total] = await Promise.all([
      prisma.harvestAnnouncement.findMany({
        where: whereClause,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              preOrders: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          harvestDate: "asc",
        },
      }),
      prisma.harvestAnnouncement.count({
        where: whereClause,
      }),
    ]);

    // Hitung total kuantitas pre-order yang telah dipesan untuk setiap pengumuman
    const reserved = announcements.length
      ? await prisma.harvestPreOrder.groupBy({
          by: ["announcementId"],
          where: {
            announcementId: { in: announcements.map((announcement) => announcement.id) },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          _sum: { quantity: true },
        })
      : [];
    // Petakan kuantitas terpesan per ID pengumuman
    const reservedByAnnouncement = new Map(
      reserved.map((row) => [row.announcementId, row._sum.quantity ?? 0]),
    );

    // Kembalikan respon sukses pengumuman panen beserta data paginasi
    return NextResponse.json({
      success: true,
      message: "Daftar pengumuman panen berhasil diambil",
      data: {
        announcements: announcements.map((announcement) => ({
          ...announcement,
          totalReservedQuantity: reservedByAnnouncement.get(announcement.id) ?? 0,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
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

// Handler HTTP POST untuk membuat pengumuman panen baru oleh supplier
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);

    try {
      // Parsing dan validasi request body menggunakan skema Zod
      const body = await request.json();
      const validatedData = createHarvestAnnouncementSchema.parse(body);
      const {
        flowerName,
        variety,
        estimatedQuantity,
        pricePerUnit,
        harvestDate,
        description,
        location,
        image,
      } = validatedData;

      // Validasi tanggal panen harus berada di masa mendatang
      const parsedHarvestDate = new Date(harvestDate);
      const now = new Date();
      if (parsedHarvestDate < now) {
        return NextResponse.json(
          {
            success: false,
            message: "Tanggal panen tidak boleh di masa lalu",
          },
          { status: 400 },
        );
      }

      // Simpan pengumuman panen baru ke database
      const announcement = await prisma.harvestAnnouncement.create({
        data: {
          supplierId: userId,
          flowerName: flowerName.trim(),
          variety: variety?.trim() || null,
          estimatedQuantity,
          pricePerUnit,
          harvestDate: new Date(harvestDate),
          description: description?.trim() || null,
          location: location?.trim() || null,
          image: image?.trim() || null,
          isActive: true,
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Kembalikan respon sukses pembuatan pengumuman panen
      return NextResponse.json(
        {
          success: true,
          message: "Pengumuman panen berhasil dibuat",
          data: { announcement },
        },
        { status: 201 },
      );
    } catch (error) {
      // Tangani error validasi skema Zod
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
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

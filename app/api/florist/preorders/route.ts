import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { autoExpireOverduePreOrders } from "@/lib/supply-chain/expire-preorders";
import { harvestDayEndWib } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";
import { createPreorderSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil riwayat pengajuan pre-order panen florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter paginasi dan filter status dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const whereClause: any = {};
    if (userRole === "FLORIST") {
      whereClause.floristId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Periksa dan batalkan otomatis pre-order yang melebihi batas pembayaran DP 3 hari
    await autoExpireOverduePreOrders();

    // Ambil data pre-order beserta informasi jadwal panen supplier dan total data
    const [preOrders, total] = await Promise.all([
      prisma.harvestPreOrder.findMany({
        where: whereClause,
        include: {
          announcement: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.harvestPreOrder.count({
        where: whereClause,
      }),
    ]);

    // Kembalikan respon sukses beserta data paginasi pre-order
    return NextResponse.json({
      success: true,
      message: "Daftar pre-order berhasil diambil",
      data: {
        preOrders,
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

// Handler HTTP POST untuk mengajukan pemesanan pre-order panen baru ke supplier
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = createPreorderSchema.parse(body);
    const { harvestAnnouncementId: announcementId, quantity, notes } = validated;

    // Ambil data pengumuman panen beserta daftar pre-order aktif
    const announcement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        preOrders: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"],
            },
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

    // Validasi keaktifan pengumuman panen
    if (!announcement.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pengumuman panen ini sudah tidak aktif atau dibatalkan oleh supplier",
        },
        { status: 400 },
      );
    }

    // Validasi tanggal panen belum terlewati
    const now = new Date();
    if (now >= harvestDayEndWib(announcement.harvestDate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Masa pre-order telah berakhir karena panen sudah selesai",
        },
        { status: 400 },
      );
    }

    // Periksa apakah florist sudah pernah mengajukan pre-order untuk pengumuman ini
    const existingPreOrder = await prisma.harvestPreOrder.findUnique({
      where: {
        announcementId_floristId: {
          announcementId: announcement.id,
          floristId: userId,
        },
      },
    });

    if (existingPreOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda sudah memiliki pengajuan pre-order untuk jadwal panen ini",
        },
        { status: 400 },
      );
    }

    // Hitung sisa kuantitas kapasitas panen yang tersedia
    const totalOrderedQuantity = announcement.preOrders.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const availableQuantity =
      announcement.estimatedQuantity - totalOrderedQuantity;

    const requestedQuantity = quantity;
    if (requestedQuantity > availableQuantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Jumlah pesanan (${requestedQuantity} tangkai) melebihi sisa kapasitas panen yang tersedia (${availableQuantity} tangkai tersisa)`,
        },
        { status: 400 },
      );
    }

    // Simpan pre-order dalam transaksi serializable dengan lock pengumuman
    const preOrder = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "HarvestAnnouncement" WHERE id = ${announcementId} FOR UPDATE`;
      const latest = await tx.harvestAnnouncement.findUnique({ where: { id: announcementId } });
      const used = await tx.harvestPreOrder.aggregate({
        where: {
          announcementId,
          status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] },
        },
        _sum: { quantity: true },
      });
      if (!latest?.isActive || !latest || new Date() > harvestDayEndWib(latest.harvestDate) ||
          (used._sum.quantity ?? 0) + requestedQuantity > latest.estimatedQuantity) {
        return null;
      }
      return tx.harvestPreOrder.create({
        data: {
          announcementId,
          floristId: userId,
          quantity: requestedQuantity,
          pricePerUnit: latest.pricePerUnit,
          totalPrice: requestedQuantity * latest.pricePerUnit,
          status: "PENDING",
          notes: notes ? notes.trim() : null,
        },
        include: {
          announcement: { include: { supplier: { select: { id: true, name: true, email: true } } } },
          florist: { select: { id: true, name: true, email: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!preOrder) {
      return NextResponse.json({ success: false, message: "Kapasitas panen berubah atau jadwal tidak aktif. Muat ulang dan coba kembali." }, { status: 409 });
    }

    // Kirim notifikasi pesanan masuk ke supplier
    const florist = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await prisma.notification.create({
      data: {
        userId: announcement.supplierId,
        title: "Pre-Order Panen Baru Masuk!",
        message: `Florist ${florist?.name || "Mitra"} memesan ${requestedQuantity} tangkai ${announcement.flowerName} untuk jadwal panen mendatang.`,
        type: "HARVEST_ANNOUNCEMENT",
        link: `/supplier/harvest-announcements/${announcement.id}`,
        isRead: false,
      },
    });

    // Kembalikan respon sukses pengajuan pre-order
    return NextResponse.json(
      {
        success: true,
        message: "Pre-order berhasil diajukan dan menunggu konfirmasi supplier",
        data: { preOrder },
      },
      { status: 201 },
    );
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

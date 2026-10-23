import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const whereClause: any = {};
    if (userRole === "FLORIST") {
      whereClause.floristId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    const preOrders = await prisma.harvestPreOrder.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pre-order berhasil diambil",
      data: {
        total: preOrders.length,
        preOrders,
      },
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

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const body = await request.json();
    const { announcementId, quantity, notes } = body;

    if (
      !announcementId ||
      typeof announcementId !== "string" ||
      announcementId.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "ID pengumuman panen (announcementId) wajib diisi",
        },
        { status: 400 },
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Jumlah pesanan (quantity) harus berupa angka bulat positif lebih dari 0",
        },
        { status: 400 },
      );
    }

    const announcement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        preOrders: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

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

    const now = new Date();
    if (now > announcement.harvestDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Masa pre-order telah berakhir karena panen sudah selesai",
        },
        { status: 400 },
      );
    }

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

    const totalOrderedQuantity = announcement.preOrders.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const availableQuantity =
      announcement.estimatedQuantity - totalOrderedQuantity;

    const requestedQuantity = Math.round(quantity);
    if (requestedQuantity > availableQuantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Jumlah pesanan (${requestedQuantity} tangkai) melebihi sisa kapasitas panen yang tersedia (${availableQuantity} tangkai tersisa)`,
        },
        { status: 400 },
      );
    }

    const totalPrice = requestedQuantity * announcement.pricePerUnit;

    const preOrder = await prisma.harvestPreOrder.create({
      data: {
        announcementId: announcement.id,
        floristId: userId,
        quantity: requestedQuantity,
        pricePerUnit: announcement.pricePerUnit,
        totalPrice: totalPrice,
        status: "PENDING",
        notes: notes ? notes.trim() : null,
      },
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
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

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

    return NextResponse.json(
      {
        success: true,
        message: "Pre-order berhasil diajukan dan menunggu konfirmasi supplier",
        data: { preOrder },
      },
      { status: 201 },
    );
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

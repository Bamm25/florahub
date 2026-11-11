import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar notifikasi pengguna
export async function GET(request: Request) {
  try {
    // Autentikasi pengguna
    const { userId } = await requireAuth(request);
    // Ambil parameter paginasi dan filter dari query string
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    // Susun filter query notifikasi
    const whereClause: any = {
      userId,
    };

    if (unreadOnly === "true") {
      whereClause.isRead = false;
    }

    // Ambil daftar notifikasi, total notifikasi, dan jumlah notifikasi belum dibaca
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.notification.count({
        where: whereClause,
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    // Kembalikan respon sukses beserta data paginasi
    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil diambil",
      data: {
        notifications,
        unreadCount,
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

// Handler HTTP PATCH untuk menandai semua notifikasi pengguna sebagai telah dibaca
export async function PATCH(request: Request) {
  try {
    // Autentikasi pengguna
    const { userId } = await requireAuth(request);
    // Perbarui status semua notifikasi yang belum dibaca
    const updateResult = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    // Kembalikan respon sukses pembaruan status notifikasi
    return NextResponse.json({
      success: true,
      message: "Semua notifikasi berhasil ditandai sebagai telah dibaca",
      data: {
        updatedCount: updateResult.count,
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

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly");

    const whereClause: any = {
      userId,
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil diambil",
      data: {
        total: notifications.length,
        unreadCount,
        notifications,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH() {
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
    const userId = (session.user as any)?.id;

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
    return NextResponse.json({
      success: true,
      message: "Semua notifikasi berhasil ditandai sebagai telah dibaca",
      data: {
        updatedCount: updateResult.count,
      },
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

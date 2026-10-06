import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
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

    const userId = (session.user as any)?.id;
    const { id: notificationId } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notifikasi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke notifikasi ini",
        },
        { status: 403 },
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil ditandai sebagai telah dibaca",
      data: {
        notification: updatedNotification,
      },
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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
    const { id: notificationId } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notifikasi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke notifikasi ini",
        },
        { status: 403 },
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

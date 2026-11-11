import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Tipe parameter rute URL
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP PATCH untuk menandai notifikasi spesifik sebagai telah dibaca
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi pengguna
    const { userId } = await requireAuth(request);
    // Ambil parameter ID notifikasi dari URL
    const { id: notificationId } = await params;

    // Cari data notifikasi berdasarkan ID
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    // Validasi keberadaan data notifikasi
    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notifikasi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan notifikasi oleh pengguna
    if (notification.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke notifikasi ini",
        },
        { status: 403 },
      );
    }

    // Perbarui status notifikasi menjadi telah dibaca
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    // Kembalikan respon sukses pembaruan notifikasi
    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil ditandai sebagai telah dibaca",
      data: {
        notification: updatedNotification,
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

// Handler HTTP DELETE untuk menghapus notifikasi spesifik
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi pengguna
    const { userId } = await requireAuth(request);
    // Ambil parameter ID notifikasi dari URL
    const { id: notificationId } = await params;

    // Cari data notifikasi berdasarkan ID
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    // Validasi keberadaan data notifikasi
    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notifikasi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan notifikasi oleh pengguna
    if (notification.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke notifikasi ini",
        },
        { status: 403 },
      );
    }

    // Hapus data notifikasi dari database
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    // Kembalikan respon sukses penghapusan notifikasi
    return NextResponse.json({
      success: true,
      message: "Notifikasi berhasil dihapus",
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

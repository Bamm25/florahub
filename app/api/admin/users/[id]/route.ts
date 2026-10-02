import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya Admin yang dapat mengakses",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const currentUserId = (session.user as any)?.id;

    if (id === currentUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak bisa ubah akun sendiri ",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { role } = body;

    if (
      !role ||
      typeof role !== "string" ||
      !Object.values(Role).includes(role as Role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Role tidak valid, Pilihan role ${Object.values(Role).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const updatedUserRole = await prisma.user.update({
      where: { id },
      data: {
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Role pengguna berhasil diperbarui",
      data: updatedUserRole,
    });
  } catch (error) {
    console.error("Error memperbarui role pengguna:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui role pengguna",
      },
      { status: 500 },
    );
  }
}

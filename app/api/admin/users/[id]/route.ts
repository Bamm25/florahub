import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id } = await params;
    if (id === userId) {
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
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui role pengguna",
      },
      { status: 500 },
    );
  }
}

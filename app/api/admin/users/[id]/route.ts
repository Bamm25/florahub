import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateUserSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PATCH untuk memperbarui data dan peran pengguna oleh admin
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter ID pengguna target dari URL
    const { id } = await params;
    // Cegah admin mengubah akun miliknya sendiri
    if (id === userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak bisa ubah akun sendiri ",
        },
        { status: 400 },
      );
    }

    // Cari data pengguna target di database
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    // Validasi keberadaan data pengguna
    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    const { role, name, email, phone, isActive } = validated;

    // Perbarui data pengguna di database
    const updatedUserRole = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role: role as Role }),
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive }),
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

    // Kembalikan respon sukses pembaruan data pengguna
    return NextResponse.json({
      success: true,
      message: "Role pengguna berhasil diperbarui",
      data: updatedUserRole,
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
        message: "Gagal memperbarui role pengguna",
      },
      { status: 500 },
    );
  }
}

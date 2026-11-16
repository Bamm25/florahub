import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateUserSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { createAuditLog } from "@/lib/auditLog";

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

    // Cegah modifikasi akun admin lain
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak dapat mengubah akun administrator lain",
        },
        { status: 403 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    const { role, name, email, phone, isActive } = validated;

    if (role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Penetapan role ADMIN tidak diizinkan melalui form pengguna umum",
        },
        { status: 403 },
      );
    }

    if (role && role !== targetUser.role) {
      const [orders, purchases, sales, preOrders, announcements, products] =
        await Promise.all([
          prisma.order.count({ where: { userId: id } }),
          prisma.stockTransaction.count({ where: { floristId: id } }),
          prisma.stockTransaction.count({
            where: { stock: { supplierId: id } },
          }),
          prisma.harvestPreOrder.count({ where: { floristId: id } }),
          prisma.harvestAnnouncement.count({ where: { supplierId: id } }),
          prisma.product.count({ where: { floristId: id } }),
        ]);
      if (
        orders + purchases + sales + preOrders + announcements + products >
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Role pengguna dengan riwayat transaksi atau katalog bisnis tidak dapat diubah",
          },
          { status: 409 },
        );
      }
    }

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
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // Catat log audit aktivitas perubahan oleh admin
    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      oldValue: {
        role: targetUser.role,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        isActive: targetUser.isActive,
      },
      newValue: {
        role: updatedUserRole.role,
        name: updatedUserRole.name,
        email: updatedUserRole.email,
        phone: updatedUserRole.phone,
        isActive: updatedUserRole.isActive,
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

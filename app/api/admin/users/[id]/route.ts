import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateUserSchema } from "@/lib/validations/schemas";
import { reportServerError } from "@/lib/server-error-report";
import { z } from "zod";

// Handler HTTP PATCH untuk mengaktifkan atau menonaktifkan akun non-admin
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
          message: "Tidak dapat mengubah akun sendiri",
        },
        { status: 403 },
      );
    }

    // Form ini hanya boleh mengubah status, bukan role atau identitas login.
    const body: unknown = await request.json().catch(() => null);
    if (body && typeof body === "object" && "role" in body) {
      return NextResponse.json({ success: false, message: "Perubahan role tidak tersedia melalui form ini" }, { status: 403 });
    }
    const { isActive, reasonCode } = updateUserSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true, isActive: true },
      });
      if (!target) return { status: 404 as const };
      if (target.role === "ADMIN") return { status: 403 as const };
      if (target.isActive === isActive) return { status: 409 as const };

      const updatedUser = await tx.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true, name: true, email: true, role: true, phone: true,
          image: true, isActive: true, createdAt: true, updatedAt: true,
        },
      });

      // Tidak mencatat PII; kegagalan audit membatalkan update dalam transaksi yang sama.
      await tx.auditLog.create({
        data: {
          userId, action: "UPDATE", entity: "User", entityId: id,
          oldValue: { isActive: target.isActive },
          newValue: { isActive: updatedUser.isActive, reasonCode },
        },
      });
      return { status: 200 as const, user: updatedUser };
    });

    if (result.status === 404) return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    if (result.status === 403) return NextResponse.json({ success: false, message: "Akun administrator tidak boleh diubah" }, { status: 403 });
    if (result.status === 409) return NextResponse.json({ success: false, message: "Tidak ada perubahan pada akun" }, { status: 409 });
    return NextResponse.json({ success: true, message: "Akun pengguna berhasil diperbarui", data: result.user });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Data atau alasan perubahan tidak valid" },
        { status: 400 },
      );
    }
    reportServerError("Admin user update failed", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui akun pengguna" },
      { status: 500 },
    );
  }
}

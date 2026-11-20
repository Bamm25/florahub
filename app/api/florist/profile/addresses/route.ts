import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { safeRevalidatePaths } from "@/lib/revalidate-safe";
import { createAddressSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP POST untuk menambahkan alamat penjemputan baru florist
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = createAddressSchema.parse(body);

    // Simpan alamat baru dalam transaksi dan jadikan default jika alamat pertama
    const newAddress = await prisma.$transaction(async (tx) => {
      const profile = await tx.floristProfile.findUnique({ where: { userId } });
      if (!profile) throw new Error("Profil florist belum tersedia");
      const existingCount = await tx.address.count({ where: { userId } });
      const makeDefault = existingCount === 0 || validated.isDefault;
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const address = await tx.address.create({
        data: {
          userId,
          label: validated.label.trim(),
          recipientName: validated.recipientName.trim(),
          phone: validated.phone.trim(),
          fullAddress: validated.fullAddress.trim(),
          city: validated.city.trim(),
          province: validated.province.trim(),
          postalCode: validated.postalCode.trim(),
          latitude: validated.latitude,
          longitude: validated.longitude,
          isDefault: makeDefault,
        },
      });
      if (makeDefault) {
        await tx.floristProfile.update({
          where: { userId },
          data: { defaultAddressId: address.id },
        });
      }
      return address;
    });

    safeRevalidatePaths(["/stores", `/stores/${userId}`]);

    // Kembalikan respon sukses penambahan alamat
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil ditambahkan",
      data: { address: newAddress },
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
      { success: false, message: "Gagal menambahkan alamat" },
      { status: 500 },
    );
  }
}

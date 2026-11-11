import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/florist/profile/addresses - Create new address
const createAddressSchema = z.object({
  label: z.string().min(1).max(50),
  recipientName: z.string().min(1).max(200),
  phone: z.string().min(10).max(20),
  fullAddress: z.string().min(10),
  city: z.string().min(1).max(100),
  province: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{5}$/, "Kode pos harus 5 digit"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    const body = await request.json();
    const validated = createAddressSchema.parse(body);

    // Paksa alamat pertama sebagai default untuk mencegah state tanpa pickup address.
    const newAddress = await prisma.$transaction(async (tx) => {
      const profile = await tx.floristProfile.findUnique({ where: { userId } });
      if (!profile) throw new Error("Profil florist belum tersedia");
      const existingCount = await tx.address.count({ where: { userId } });
      const makeDefault = existingCount === 0 || validated.isDefault;
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
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
        await tx.floristProfile.update({ where: { userId }, data: { defaultAddressId: address.id } });
      }
      return address;
    });

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil ditambahkan",
      data: { address: newAddress },
    });
  } catch (error) {
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

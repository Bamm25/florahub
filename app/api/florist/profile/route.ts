import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP GET untuk mengambil data profil toko florist beserta alamat
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    // Cari data profil toko florist di database
    const profile = await prisma.floristProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        shopName: true,
        shopDescription: true,
        logo: true,
        banner: true,
        defaultAddressId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Validasi keberadaan profil toko florist
    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "FloristProfile tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Ambil data akun pengguna florist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    // Ambil seluruh daftar alamat penjemputan florist
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    // Kembalikan respon sukses data profil florist
    return NextResponse.json({
      success: true,
      message: "Florist profile berhasil diambil",
      data: {
        profile,
        user,
        addresses,
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil florist profile" },
      { status: 500 },
    );
  }
}

// Skema validasi pembaruan informasi toko florist
const updateProfileSchema = z.object({
  shopName: z.string().min(3).max(200).optional(),
  shopDescription: z.string().max(1000).optional().nullable(),
  logo: z.string().url().max(500).optional().nullable(),
  banner: z.string().url().max(500).optional().nullable(),
});

// Handler HTTP PUT untuk memperbarui data informasi profil toko florist
export async function PUT(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    // Cari data profil toko florist eksisting
    const profile = await prisma.floristProfile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ success: false, message: "Profil florist tidak ditemukan" }, { status: 404 });
    }

    // Perbarui data informasi toko florist di database
    const updatedProfile = await prisma.floristProfile.update({
      where: { userId },
      data: {
        shopName: validated.shopName,
        shopDescription: validated.shopDescription,
        logo: validated.logo,
        banner: validated.banner,
      },
    });

    // Kembalikan respon sukses pembaruan profil toko
    return NextResponse.json({
      success: true,
      message: "Shop info berhasil diperbarui",
      data: { profile: updatedProfile },
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
      { success: false, message: "Gagal memperbarui shop info" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Skema validasi pembaruan data alamat florist
const updateAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  recipientName: z.string().min(1).max(200).optional(),
  phone: z.string().min(10).max(20).optional(),
  fullAddress: z.string().min(10).optional(),
  city: z.string().min(1).max(100).optional(),
  province: z.string().min(1).max(100).optional(),
  postalCode: z.string().regex(/^\d{5}$/, "Kode pos harus 5 digit").optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// Handler HTTP PUT untuk memperbarui data alamat florist berdasarkan ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Ambil parameter ID alamat dari URL
    const { id } = await params;

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateAddressSchema.parse(body);

    // Cari data alamat eksisting di database
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan data alamat
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan alamat oleh pengguna
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Perbarui data alamat di database
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: validated,
    });

    // Kembalikan respon sukses pembaruan data alamat
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diperbarui",
      data: { address: updatedAddress },
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
      { success: false, message: "Gagal memperbarui alamat" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus alamat florist berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Ambil parameter ID alamat dari URL
    const { id } = await params;

    // Cari data alamat eksisting di database
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan data alamat
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan alamat oleh pengguna
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Validasi apakah alamat sudah pernah digunakan oleh pesanan
    const linkedOrders = await prisma.order.count({ where: { addressId: id } });
    if (linkedOrders > 0) {
      return NextResponse.json(
        { success: false, message: "Alamat sudah dipakai oleh pesanan dan tidak dapat dihapus." },
        { status: 400 },
      );
    }

    // Cegah penghapusan jika hanya tersisa satu alamat
    const totalAddresses = await prisma.address.count({ where: { userId } });
    if (totalAddresses <= 1) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat menghapus alamat terakhir. Tambahkan alamat baru terlebih dahulu." },
        { status: 400 },
      );
    }

    // Hapus alamat dan reset referensi alamat default jika terkait
    await prisma.$transaction(async (tx) => {
      const profile = await tx.floristProfile.findUnique({ where: { userId } });
      if (profile?.defaultAddressId === id) {
        await tx.floristProfile.update({ where: { userId }, data: { defaultAddressId: null } });
      }
      await tx.address.delete({ where: { id, userId } });
    });

    // Kembalikan respon sukses penghapusan alamat
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus alamat" },
      { status: 500 },
    );
  }
}

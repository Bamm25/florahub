import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP PUT untuk menetapkan alamat sebagai alamat penjemputan default florist
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Ambil parameter ID alamat dari URL
    const { id } = await params;

    // Cari data alamat target di database
    const targetAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan data alamat
    if (!targetAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan alamat oleh pengguna
    if (targetAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Cari profil toko florist pengguna
    const profile = await prisma.floristProfile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ success: false, message: "Profil florist belum tersedia" }, { status: 404 });
    }

    // Lewati pembaruan jika alamat tersebut sudah menjadi alamat default
    if (targetAddress.isDefault && profile?.defaultAddressId === id) {
      return NextResponse.json({
        success: true,
        message: "Alamat ini sudah menjadi alamat default",
        data: { address: targetAddress },
      });
    }

    // Perbarui status default alamat dan profil florist dalam transaksi atomic
    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      const address = await tx.address.update({ where: { id, userId }, data: { isDefault: true } });
      await tx.floristProfile.update({ where: { userId }, data: { defaultAddressId: id } });
      return address;
    });

    // Kembalikan respon sukses penetapan alamat default
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diset sebagai default",
      data: { address: updatedAddress },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal set alamat default" },
      { status: 500 },
    );
  }
}

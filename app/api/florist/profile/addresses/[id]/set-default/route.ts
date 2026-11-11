import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT /api/florist/profile/addresses/[id]/set-default - Set address sebagai default
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    // Check ownership
    const targetAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!targetAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (targetAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    const profile = await prisma.floristProfile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ success: false, message: "Profil florist belum tersedia" }, { status: 404 });
    }

    // Jika sudah default, skip
    if (targetAddress.isDefault && profile?.defaultAddressId === id) {
      return NextResponse.json({
        success: true,
        message: "Alamat ini sudah menjadi alamat default",
        data: { address: targetAddress },
      });
    }

    // Update alamat default dan profil dalam satu transaksi.
    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      const address = await tx.address.update({ where: { id, userId }, data: { isDefault: true } });
      await tx.floristProfile.update({ where: { userId }, data: { defaultAddressId: id } });
      return address;
    });

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diset sebagai default",
      data: { address: updatedAddress },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal set alamat default" },
      { status: 500 },
    );
  }
}

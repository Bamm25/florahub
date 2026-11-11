import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// PUT /api/florist/profile/addresses/[id] - Update address
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    const body = await request.json();
    const validated = updateAddressSchema.parse(body);

    // Check ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Update address
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diperbarui",
      data: { address: updatedAddress },
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
      { success: false, message: "Gagal memperbarui alamat" },
      { status: 500 },
    );
  }
}

// DELETE /api/florist/profile/addresses/[id] - Delete address
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    // Check ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Alamat ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    const linkedOrders = await prisma.order.count({ where: { addressId: id } });
    if (linkedOrders > 0) {
      return NextResponse.json(
        { success: false, message: "Alamat sudah dipakai oleh pesanan dan tidak dapat dihapus." },
        { status: 400 },
      );
    }

    const totalAddresses = await prisma.address.count({ where: { userId } });
    if (totalAddresses <= 1) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat menghapus alamat terakhir. Tambahkan alamat baru terlebih dahulu." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const profile = await tx.floristProfile.findUnique({ where: { userId } });
      if (profile?.defaultAddressId === id) {
        await tx.floristProfile.update({ where: { userId }, data: { defaultAddressId: null } });
      }
      await tx.address.delete({ where: { id, userId } });
    });

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus alamat" },
      { status: 500 },
    );
  }
}

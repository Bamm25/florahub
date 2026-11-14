import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateAddressSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute dengan ID alamat
type RouteParms = { params: Promise<{ id: string }> };

// Handler HTTP GET untuk mengambil rincian alamat pelanggan berdasarkan ID
export async function GET(request: Request, { params }: RouteParms) {
  try {
    // Validasi sesi pengguna dan ambil ID alamat dari parameter
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Cari data alamat berdasarkan ID
    const address = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan data alamat
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi kepemilikan alamat oleh pengguna terkait
    if (address.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Kembalikan data detail alamat pelanggan
    return NextResponse.json({
      success: true,
      message: "Detail alamat berhasil diambil",
      data: { address },
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data alamat pelanggan
export async function PUT(request: Request, { params }: RouteParms) {
  try {
    // Validasi sesi pengguna dan ambil ID alamat dari parameter
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Periksa keberadaan alamat sebelum pembaruan
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan alamat
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi kepemilikan alamat oleh pengguna terkait
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Parse dan validasi muatan pembaruan alamat
    const body = await request.json();
    const validatedData = updateAddressSchema.parse(body);
    const {
      label,
      recipientName,
      phone,
      fullAddress,
      city,
      province,
      postalCode,
      latitude,
      longitude,
      isDefault,
    } = validatedData;

    // Nonaktifkan status utama alamat lain jika alamat ini dijadikan default
    if (isDefault === true) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Simpan perubahan data alamat ke database
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        label: label !== undefined ? label : existingAddress.label,
        recipientName:
          recipientName !== undefined
            ? recipientName
            : existingAddress.recipientName,
        phone: phone !== undefined ? phone : existingAddress.phone,
        fullAddress:
          fullAddress !== undefined ? fullAddress : existingAddress.fullAddress,
        city: city !== undefined ? city : existingAddress.city,
        province: province !== undefined ? province : existingAddress.province,
        postalCode:
          postalCode !== undefined ? postalCode : existingAddress.postalCode,
        latitude:
          latitude !== undefined ? latitude : existingAddress.latitude,
        longitude:
          longitude !== undefined ? longitude : existingAddress.longitude,
        isDefault:
          isDefault !== undefined
            ? Boolean(isDefault)
            : existingAddress.isDefault,
      },
    });

    // Kembalikan data alamat yang berhasil diperbarui
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diperbarui",
      data: { address: updatedAddress },
    });
  } catch (error) {
    if (error instanceof Response || error instanceof NextResponse) {
      return error;
    }
    // Tangani galat validasi skema masukan
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    reportServerError("[PUT /api/customer/addresses/[id] error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus alamat pelanggan berdasarkan ID
export async function DELETE(request: Request, { params }: RouteParms) {
  try {
    // Validasi sesi pengguna dan ambil ID alamat dari parameter
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Periksa keberadaan alamat sebelum dihapus
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validasi keberadaan alamat
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi kepemilikan alamat oleh pengguna terkait
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Hapus data alamat dari database
    await prisma.address.delete({
      where: { id },
    });

    // Tetapkan alamat tersisa sebagai utama jika alamat default dihapus
    if (existingAddress.isDefault) {
      const remainingAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (remainingAddress) {
        await prisma.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true },
        });
      }
    }

    // Kirim respons berhasil penghapusan alamat
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil dihapus",
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

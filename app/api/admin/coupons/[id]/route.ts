import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { CouponType } from "@prisma/client";
import { NextResponse } from "next/server";
import { updateCouponSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute URL
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk mengambil detail data kupon berdasarkan ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter ID kupon dari URL
    const { id: couponId } = await params;

    // Cari data kupon beserta pembuat dan riwayat penggunaan
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        usages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Validasi keberadaan data kupon
    if (!coupon) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Kembalikan respon sukses data detail kupon
    return NextResponse.json({
      success: true,
      message: "Detail kupon berhasil diambil",
      data: { coupon },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
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

// Handler HTTP PUT untuk memperbarui data kupon berdasarkan ID
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter ID kupon dari URL
    const { id: couponId } = await params;

    // Cari data kupon eksisting di database
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    // Validasi keberadaan data kupon
    if (!existingCoupon) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validatedData = updateCouponSchema.parse(body);
    const {
      name,
      description,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      usagePerUser,
      isActive,
    } = validatedData;

    // Validasi rentang nilai diskon untuk tipe persentase
    const targetType = type !== undefined ? type : existingCoupon.type;
    if (value !== undefined && targetType === "PERCENTAGE" && (value < 1 || value > 100)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Untuk tipe PERCENTAGE, nilai value harus antara 1 sampai 100 persen",
        },
        { status: 400 },
      );
    }

    // Validasi rentang waktu masa berlaku kupon
    let startDate = existingCoupon.validFrom;
    let endDate = existingCoupon.validUntil;

    if (validFrom !== undefined) {
      startDate = new Date(validFrom);
    }

    if (validUntil !== undefined) {
      endDate = new Date(validUntil);
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal validUntil harus lebih besar dari validFrom",
        },
        { status: 400 },
      );
    }

    // Perbarui data kupon di database
    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        name: name !== undefined ? name.trim() : existingCoupon.name,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : existingCoupon.description,
        type: type !== undefined ? (type as CouponType) : existingCoupon.type,
        value: value !== undefined ? Math.round(value) : existingCoupon.value,
        minPurchase:
          minPurchase !== undefined
            ? minPurchase
              ? Math.round(minPurchase)
              : null
            : existingCoupon.minPurchase,
        maxDiscount:
          maxDiscount !== undefined
            ? maxDiscount
              ? Math.round(maxDiscount)
              : null
            : existingCoupon.maxDiscount,
        validFrom: startDate,
        validUntil: endDate,
        usageLimit:
          usageLimit !== undefined
            ? usageLimit
              ? Math.round(usageLimit)
              : null
            : existingCoupon.usageLimit,
        usagePerUser:
          usagePerUser !== undefined
            ? Math.round(usagePerUser)
            : existingCoupon.usagePerUser,
        isActive:
          isActive !== undefined ? Boolean(isActive) : existingCoupon.isActive,
        applicableFor: existingCoupon.applicableFor,
      },
    });
    // Kembalikan respon sukses pembaruan data kupon
    return NextResponse.json({
      success: true,
      message: "Data kupon berhasil diperbarui",
      data: { coupon: updatedCoupon },
    });
  } catch (error) {
    // Tangani error validasi Zod, otorisasi, atau internal server error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.issues },
        { status: 400 }
      );
    }
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

// Handler HTTP DELETE untuk menghapus kupon berdasarkan ID
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter ID kupon dari URL
    const { id: couponId } = await params;

    // Cari data kupon eksisting di database
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    // Validasi keberadaan data kupon
    if (!existingCoupon) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Hapus data kupon dari database
    await prisma.coupon.delete({
      where: { id: couponId },
    });

    // Kembalikan respon sukses penghapusan kupon
    return NextResponse.json({
      success: true,
      message: "Kupon berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
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

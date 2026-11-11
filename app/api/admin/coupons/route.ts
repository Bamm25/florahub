import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { CouponType } from "@prisma/client";
import { NextResponse } from "next/server";
import { createCouponSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar kupon promosi
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Ambil daftar kupon beserta jumlah penggunaan dan total data kupon
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              usages: true,
            },
          },
        },
      }),
      prisma.coupon.count(),
    ]);

    // Kembalikan respon sukses beserta data paginasi kupon
    return NextResponse.json({
      success: true,
      message: "Daftar kupon berhasil diambil",
      data: {
        coupons,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
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

// Handler HTTP POST untuk membuat kupon promosi baru
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);

    // Parsing dan validasi data request body menggunakan skema Zod
    const body = await request.json();
    const validatedData = createCouponSchema.parse(body);
    const {
      code,
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
    if (type === "PERCENTAGE" && (value < 1 || value > 100)) {
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
    const startDate = validFrom ? new Date(validFrom) : new Date();
    const endDate = validUntil ? new Date(validUntil) : new Date();

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal validUntil harus lebih besar dari validFrom",
        },
        { status: 400 },
      );
    }

    // Validasi keunikan kode kupon di database
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existingCoupon) {
      return NextResponse.json(
        {
          success: false,
          message: `Kode kupon "${code}" sudah terdaftar`,
        },
        { status: 400 },
      );
    }

    // Simpan data kupon baru ke database
    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        name: name.trim(),
        description: description ? description.trim() : null,
        type: type as CouponType,
        value: Math.round(value),
        minPurchase: minPurchase ? Math.round(minPurchase) : null,
        maxDiscount: maxDiscount ? Math.round(maxDiscount) : null,
        validFrom: startDate,
        validUntil: endDate,
        usageLimit: usageLimit ? Math.round(usageLimit) : null,
        usagePerUser: Math.round(usagePerUser),
        createdById: userId,
        applicableFor: [],
        isActive,
      },
    });

    // Kembalikan respon sukses pembuatan kupon
    return NextResponse.json(
      {
        success: true,
        message: "Kupon promosi berhasil dibuat",
        data: {
          coupon: newCoupon,
        },
      },
      { status: 201 },
    );
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

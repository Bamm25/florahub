import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { CouponType } from "@prisma/client";
import { NextResponse } from "next/server";
import { createCouponSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

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

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);

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

    // Business logic validation: PERCENTAGE value range
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

    // Business logic validation: date comparison
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

    // Business logic validation: unique code check
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

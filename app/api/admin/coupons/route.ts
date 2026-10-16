import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CouponType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya Admin yang dapat mengakses data pesanan global",
        },
        { status: 403 },
      );
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      message: "Daftar kupon berhasil diambil",
      data: {
        total: coupons.length,
        coupons,
      },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya Admin yang dapat mengakses data pesanan global",
        },
        { status: 403 },
      );
    }

    const adminId = (session.user as any)?.id;
    const body = await request.json();
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
      applicableFor,
    } = body;

    if (
      !code ||
      !name ||
      !type ||
      value === undefined ||
      !validFrom ||
      !validUntil
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Field code, name, type, value, validFrom, dan validUntil wajib diisi",
        },
        { status: 400 },
      );
    }

    const validTypes: CouponType[] = ["PERCENTAGE", "FIXED", "FREE_SHIPPING"];
    if (!validTypes.includes(type as CouponType)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tipe kupon tidak valid. Pilih antara: PERCENTAGE, FIXED, atau FREE_SHIPPING",
        },
        { status: 400 },
      );
    }

    if (typeof value !== "number" || value <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nilai diskon (value) harus berupa angka positif lebih dari 0",
        },
        { status: 400 },
      );
    }

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

    const startDate = new Date(validFrom);
    const endDate = new Date(validUntil);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Format tanggal validFrom atau validUntil tidak valid",
        },
        { status: 400 },
      );
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

    const normalizedCode = code.trim().toUpperCase();
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existingCoupon) {
      return NextResponse.json(
        {
          success: false,
          message: `Kode kupon "${normalizedCode}" sudah terdaftar`,
        },
        { status: 400 },
      );
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        type: type as CouponType,
        value: Math.round(value),
        minPurchase: minPurchase ? Math.round(minPurchase) : null,
        maxDiscount: maxDiscount ? Math.round(maxDiscount) : null,
        validFrom: startDate,
        validUntil: endDate,
        usageLimit: usageLimit ? Math.round(usageLimit) : null,
        usagePerUser: usagePerUser ? Math.round(usagePerUser) : 1,
        createdById: adminId,
        applicableFor: Array.isArray(applicableFor) ? applicableFor : [],
        isActive: true,
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
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

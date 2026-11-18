import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { isPrismaUniqueError } from "@/lib/prisma-errors";
import { reportServerError } from "@/lib/server-error-report";
import {
  adminCouponQuerySchema,
  createCouponSchema,
} from "@/lib/validations/schemas";
import type { CouponType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar kupon promosi beserta filter dan paginasi
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type")?.trim();
    const rawIsActive = searchParams.get("isActive")?.trim();
    const rawSearch = searchParams.get("search")?.trim();

    const parsed = adminCouponQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: rawType || undefined,
      isActive: rawIsActive || undefined,
      search: rawSearch || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Filter kupon tidak valid" },
        { status: 400 },
      );
    }

    const { page, limit, type, isActive, search } = parsed.data;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.CouponWhereInput = {
      ...(type ? { type } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
      prisma.coupon.count({ where: whereClause }),
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
    reportServerError("Admin coupons list failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar kupon" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk membuat kupon promosi baru secara atomik dengan audit log
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);

    const body: unknown = await request.json().catch(() => null);
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
      applicableFor,
      isActive,
    } = validatedData;

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

    if (type === "FIXED" && value < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Untuk tipe FIXED, nilai potongan minimal Rp 1",
        },
        { status: 400 },
      );
    }

    const startDate = validFrom ? new Date(validFrom) : new Date();
    const endDate = validUntil
      ? new Date(validUntil)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal validUntil harus lebih besar dari validFrom",
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingCoupon = await tx.coupon.findUnique({
        where: { code },
        select: { id: true },
      });

      if (existingCoupon) {
        return { status: 409 as const };
      }

      const newCoupon = await tx.coupon.create({
        data: {
          code,
          name: name.trim(),
          description: description ? description.trim() : null,
          type: type as CouponType,
          value: Math.round(value),
          minPurchase:
            minPurchase !== undefined && minPurchase !== null
              ? Math.round(minPurchase)
              : null,
          maxDiscount:
            maxDiscount !== undefined && maxDiscount !== null
              ? Math.round(maxDiscount)
              : null,
          validFrom: startDate,
          validUntil: endDate,
          usageLimit:
            usageLimit !== undefined && usageLimit !== null
              ? Math.round(usageLimit)
              : null,
          usagePerUser: Math.round(usagePerUser),
          createdById: userId,
          applicableFor: applicableFor ?? [],
          isActive,
        },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "Coupon",
          entityId: newCoupon.id,
          newValue: {
            code: newCoupon.code,
            type: newCoupon.type,
            value: newCoupon.value,
            isActive: newCoupon.isActive,
          },
        },
      });

      return { status: 201 as const, coupon: newCoupon };
    });

    if (result.status === 409) {
      return NextResponse.json(
        {
          success: false,
          message: `Kode kupon "${code}" sudah terdaftar`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Kupon promosi berhasil dibuat",
        data: { coupon: result.coupon },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { success: false, message: "Kode kupon sudah terdaftar" },
        { status: 409 },
      );
    }
    reportServerError("Admin coupon creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat kupon promosi" },
      { status: 500 },
    );
  }
}

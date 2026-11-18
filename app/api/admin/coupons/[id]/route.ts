import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { updateCouponSchema } from "@/lib/validations/schemas";
import type { CouponType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// Handler HTTP GET untuk mengambil detail data kupon berdasarkan ID (dengan masking PII)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAuth(request, ["ADMIN"]);
    const { id: couponId } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        _count: {
          select: { usages: true },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        usages: {
          take: 20,
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
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Kupon tidak ditemukan" },
        { status: 404 },
      );
    }

    const sanitizedCoupon = {
      ...coupon,
      createdBy: coupon.createdBy
        ? {
            id: coupon.createdBy.id,
            name: coupon.createdBy.name,
            maskedEmail: maskEmail(coupon.createdBy.email),
          }
        : null,
      usages: coupon.usages.map((usage) => ({
        id: usage.id,
        discount: usage.discount,
        createdAt: usage.createdAt,
        order: usage.order,
        user: {
          id: usage.user.id,
          name: usage.user.name,
          maskedEmail: maskEmail(usage.user.email),
        },
      })),
    };

    return NextResponse.json({
      success: true,
      message: "Detail kupon berhasil diambil",
      data: { coupon: sanitizedCoupon },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Admin coupon detail failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail kupon" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui kupon secara atomik dengan audit log
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id: couponId } = await params;

    const body: unknown = await request.json().catch(() => null);
    const validatedData = updateCouponSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const existingCoupon = await tx.coupon.findUnique({
        where: { id: couponId },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });

      if (!existingCoupon) {
        return { status: 404 as const, message: "Kupon tidak ditemukan" };
      }

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

      const hasUsages =
        existingCoupon.usageCount > 0 || existingCoupon._count.usages > 0;

      if (code !== undefined && code !== existingCoupon.code) {
        if (hasUsages) {
          return {
            status: 409 as const,
            message:
              "Kode kupon yang sudah pernah digunakan tidak dapat diubah",
          };
        }
        const duplicateCode = await tx.coupon.findFirst({
          where: { code, NOT: { id: couponId } },
          select: { id: true },
        });
        if (duplicateCode) {
          return {
            status: 409 as const,
            message: "Kode kupon sudah digunakan oleh kupon lain",
          };
        }
      }

      const targetType = type !== undefined ? type : existingCoupon.type;
      const targetValue =
        value !== undefined ? value : existingCoupon.value;

      if (targetType === "PERCENTAGE" && (targetValue < 1 || targetValue > 100)) {
        return {
          status: 400 as const,
          message:
            "Untuk tipe PERCENTAGE, nilai value harus antara 1 sampai 100 persen",
        };
      }

      if (targetType === "FIXED" && targetValue < 1) {
        return {
          status: 400 as const,
          message: "Untuk tipe FIXED, nilai potongan minimal Rp 1",
        };
      }

      if (
        usageLimit !== undefined &&
        usageLimit !== null &&
        usageLimit < existingCoupon.usageCount
      ) {
        return {
          status: 400 as const,
          message:
            "Kuota penggunaan tidak boleh lebih kecil dari jumlah pemakaian saat ini",
        };
      }

      const startDate =
        validFrom !== undefined
          ? new Date(validFrom)
          : existingCoupon.validFrom;
      const endDate =
        validUntil !== undefined
          ? new Date(validUntil)
          : existingCoupon.validUntil;

      if (endDate <= startDate) {
        return {
          status: 400 as const,
          message: "Tanggal validUntil harus lebih besar dari validFrom",
        };
      }

      const updatedCoupon = await tx.coupon.update({
        where: { id: couponId },
        data: {
          code: code !== undefined ? code : existingCoupon.code,
          name: name !== undefined ? name.trim() : existingCoupon.name,
          description:
            description !== undefined
              ? description
                ? description.trim()
                : null
              : existingCoupon.description,
          type:
            type !== undefined ? (type as CouponType) : existingCoupon.type,
          value:
            value !== undefined ? Math.round(value) : existingCoupon.value,
          minPurchase:
            minPurchase !== undefined
              ? minPurchase !== null
                ? Math.round(minPurchase)
                : null
              : existingCoupon.minPurchase,
          maxDiscount:
            maxDiscount !== undefined
              ? maxDiscount !== null
                ? Math.round(maxDiscount)
                : null
              : existingCoupon.maxDiscount,
          validFrom: startDate,
          validUntil: endDate,
          usageLimit:
            usageLimit !== undefined
              ? usageLimit !== null
                ? Math.round(usageLimit)
                : null
              : existingCoupon.usageLimit,
          usagePerUser:
            usagePerUser !== undefined
              ? Math.round(usagePerUser)
              : existingCoupon.usagePerUser,
          isActive:
            isActive !== undefined
              ? Boolean(isActive)
              : existingCoupon.isActive,
          applicableFor:
            applicableFor !== undefined
              ? applicableFor
              : existingCoupon.applicableFor,
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
          action: "UPDATE",
          entity: "Coupon",
          entityId: couponId,
          oldValue: {
            code: existingCoupon.code,
            type: existingCoupon.type,
            value: existingCoupon.value,
            isActive: existingCoupon.isActive,
          },
          newValue: {
            code: updatedCoupon.code,
            type: updatedCoupon.type,
            value: updatedCoupon.value,
            isActive: updatedCoupon.isActive,
          },
        },
      });

      return { status: 200 as const, coupon: updatedCoupon };
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data kupon berhasil diperbarui",
      data: { coupon: result.coupon },
    });
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
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, message: "Kode kupon sudah terdaftar" },
        { status: 409 },
      );
    }
    reportServerError("Admin coupon update failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui kupon" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus kupon yang belum pernah dipakai, atau mengarsipkan (nonaktif) bila sudah terpakai
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id: couponId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const existingCoupon = await tx.coupon.findUnique({
        where: { id: couponId },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });

      if (!existingCoupon) {
        return { status: 404 as const, message: "Kupon tidak ditemukan" };
      }

      const totalUsages = Math.max(
        existingCoupon.usageCount,
        existingCoupon._count.usages,
      );

      // Lindungi riwayat diskon CouponUsage dari cascade delete
      if (totalUsages > 0) {
        if (!existingCoupon.isActive) {
          return {
            status: 409 as const,
            message:
              "Kupon yang memiliki riwayat pemakaian sudah berstatus nonaktif dan tidak dapat dihapus fisik",
          };
        }

        const archivedCoupon = await tx.coupon.update({
          where: { id: couponId },
          data: { isActive: false },
          include: {
            _count: {
              select: { usages: true },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "UPDATE",
            entity: "Coupon",
            entityId: couponId,
            oldValue: { isActive: true },
            newValue: {
              isActive: false,
              reason: "ARCHIVED_ON_DELETE_WITH_USAGES",
            },
          },
        });

        return {
          status: 200 as const,
          archived: true,
          coupon: archivedCoupon,
        };
      }

      await tx.coupon.delete({
        where: { id: couponId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entity: "Coupon",
          entityId: couponId,
          oldValue: {
            code: existingCoupon.code,
            isActive: existingCoupon.isActive,
          },
        },
      });

      return { status: 200 as const, archived: false };
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    if (result.archived) {
      return NextResponse.json({
        success: true,
        message:
          "Kupon sudah pernah digunakan sehingga dinonaktifkan (diarsipkan) untuk menjaga riwayat pesanan",
        data: {
          archived: true,
          coupon: result.coupon,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Kupon berhasil dihapus secara permanen",
      data: {
        archived: false,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Admin coupon deletion failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus kupon" },
      { status: 500 },
    );
  }
}

import type { Prisma, PrismaClient } from "@prisma/client";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

type DbLike = PrismaClient | Prisma.TransactionClient;

export class CouponValidationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ValidatedCouponResult {
  coupon: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
    value: number;
  };
  discountAmount: number;
}

export async function validateAndCalculateCoupon(
  db: DbLike,
  params: {
    code: string;
    userId: string;
    subtotal: number;
    shippingCost: number;
    productIds?: string[];
    categoryIds?: string[];
  },
): Promise<ValidatedCouponResult> {
  const normalizedCode = params.code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon) {
    throw new CouponValidationError(
      404,
      `Kode kupon "${normalizedCode}" tidak ditemukan atau tidak valid`,
    );
  }

  if (!coupon.isActive) {
    throw new CouponValidationError(400, "Kupon promosi ini sudah tidak aktif");
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    throw new CouponValidationError(
      400,
      `Kupon ini baru dapat digunakan mulai tanggal ${formatDate(coupon.validFrom)}`,
    );
  }

  if (now > coupon.validUntil) {
    throw new CouponValidationError(
      400,
      "Kupon promosi ini telah kadaluarsa",
    );
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponValidationError(
      400,
      "Kuota penggunaan kupon ini telah habis",
    );
  }

  const userUsageCount = await db.couponUsage.count({
    where: {
      couponId: coupon.id,
      userId: params.userId,
    },
  });

  if (userUsageCount >= coupon.usagePerUser) {
    throw new CouponValidationError(
      400,
      `Anda telah mencapai batas maksimal penggunaan kupon ini (${coupon.usagePerUser}x pakai)`,
    );
  }

  if (coupon.minPurchase !== null && params.subtotal < coupon.minPurchase) {
    throw new CouponValidationError(
      400,
      `Minimal belanja untuk menggunakan kupon ini adalah ${formatRupiah(coupon.minPurchase)}`,
    );
  }

  if (coupon.applicableFor.length > 0) {
    const scopeTargets = new Set(
      [...(params.productIds ?? []), ...(params.categoryIds ?? [])].map((id) =>
        id.trim(),
      ),
    );
    const hasScopeInput =
      (params.productIds?.length ?? 0) > 0 ||
      (params.categoryIds?.length ?? 0) > 0;
    const isApplicable =
      hasScopeInput &&
      coupon.applicableFor.some((target) => scopeTargets.has(target));

    if (!isApplicable) {
      throw new CouponValidationError(
        400,
        "Kupon ini tidak berlaku untuk produk atau kategori di keranjang Anda",
      );
    }
  }

  let discountAmount = 0;

  if (coupon.type === "PERCENTAGE") {
    const rawDiscount = Math.round((params.subtotal * coupon.value) / 100);
    discountAmount =
      coupon.maxDiscount !== null
        ? Math.min(rawDiscount, coupon.maxDiscount)
        : rawDiscount;
    discountAmount = Math.min(discountAmount, params.subtotal);
  } else if (coupon.type === "FIXED") {
    discountAmount = Math.min(Math.round(coupon.value), params.subtotal);
  } else if (coupon.type === "FREE_SHIPPING") {
    const maxShippingDiscount =
      coupon.maxDiscount !== null
        ? coupon.maxDiscount
        : coupon.value > 0
          ? coupon.value
          : params.shippingCost;
    discountAmount = Math.min(params.shippingCost, maxShippingDiscount);
  } else {
    throw new CouponValidationError(
      400,
      `Tipe kupon tidak valid: ${coupon.type}`,
    );
  }

  discountAmount = Math.max(0, Math.round(discountAmount));

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
    },
    discountAmount,
  };
}

export async function applyCouponAtomicallyInTx(
  tx: Prisma.TransactionClient,
  params: {
    couponId: string;
    orderId: string;
    userId: string;
    discount: number;
  },
): Promise<void> {
  // Kunci baris kupon agar batas penggunaan global & per-pengguna tidak bisa ditembus request paralel
  await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${params.couponId} FOR UPDATE`;

  const freshCoupon = await tx.coupon.findUnique({
    where: { id: params.couponId },
  });

  const now = new Date();
  if (
    !freshCoupon ||
    !freshCoupon.isActive ||
    now < freshCoupon.validFrom ||
    now > freshCoupon.validUntil
  ) {
    throw new CouponValidationError(
      409,
      "Kupon sudah tidak berlaku saat transaksi diproses",
    );
  }

  if (
    freshCoupon.usageLimit !== null &&
    freshCoupon.usageCount >= freshCoupon.usageLimit
  ) {
    throw new CouponValidationError(409, "Kuota penggunaan kupon telah habis");
  }

  const userUsages = await tx.couponUsage.count({
    where: {
      couponId: freshCoupon.id,
      userId: params.userId,
    },
  });

  if (userUsages >= freshCoupon.usagePerUser) {
    throw new CouponValidationError(
      409,
      "Batas penggunaan kupon per pengguna telah tercapai",
    );
  }

  await tx.couponUsage.create({
    data: {
      couponId: freshCoupon.id,
      orderId: params.orderId,
      userId: params.userId,
      discount: params.discount,
    },
  });

  await tx.coupon.update({
    where: { id: freshCoupon.id },
    data: {
      usageCount: { increment: 1 },
    },
  });
}

export async function releaseCouponUsageInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const usage = await tx.couponUsage.findUnique({
    where: { orderId },
    select: { id: true, couponId: true },
  });

  if (!usage) return;

  await tx.couponUsage.delete({
    where: { id: usage.id },
  });

  await tx.coupon.updateMany({
    where: {
      id: usage.couponId,
      usageCount: { gt: 0 },
    },
    data: {
      usageCount: { decrement: 1 },
    },
  });
}

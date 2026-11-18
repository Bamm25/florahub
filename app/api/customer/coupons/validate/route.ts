import { requireAuth } from "@/lib/middleware/requireAuth";
import { checkRateLimit } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";
import { CouponValidationError, validateAndCalculateCoupon } from "@/lib/coupons";
import { reportServerError } from "@/lib/server-error-report";
import { validateCouponSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP POST untuk memvalidasi kupon diskon dan menghitung potongan harga
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);

    const limitCheck = checkRateLimit(`coupon-validate:${userId}`, 20, 60_000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Terlalu banyak percobaan validasi kupon. Coba lagi nanti.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limitCheck.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const validated = validateCouponSchema.parse(body);
    const { code, subtotal, shippingCost = 0, productIds } = validated;

    let categoryIds: string[] | undefined;
    if (productIds && productIds.length > 0) {
      const matchedProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { categoryId: true },
      });
      categoryIds = [...new Set(matchedProducts.map((p) => p.categoryId))];
    }

    const { coupon, discountAmount } = await validateAndCalculateCoupon(
      prisma,
      {
        code,
        userId,
        subtotal,
        shippingCost,
        productIds,
        categoryIds,
      },
    );

    const totalOrderAmount = subtotal + shippingCost;
    const finalAmount = Math.max(0, totalOrderAmount - discountAmount);

    return NextResponse.json({
      success: true,
      message: "Kupon berhasil diterapkan",
      data: {
        coupon,
        calculation: {
          subtotal,
          shippingCost,
          totalBeforeDiscount: totalOrderAmount,
          discountAmount,
          finalAmount,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error instanceof CouponValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status },
      );
    }
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
    reportServerError("[COUPON_VALIDATE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

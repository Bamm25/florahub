import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateCouponSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// POST: Validate coupon code dan calculate discount
export async function POST(request: Request) {
  try {
    // Validate user session dan parse request body
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const validated = validateCouponSchema.parse(body);
    const { code, subtotal, shippingCost = 0 } = validated;

    // Normalize coupon code ke uppercase
    const normalizedCode = code.trim().toUpperCase();

    // Query coupon by code
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    // Validate coupon existence
    if (!coupon) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode kupon tidak ditemukan atau tidak valid",
        },
        { status: 404 },
      );
    }

    // Validate coupon masih aktif
    if (!coupon.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon promosi ini sudah tidak aktif",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    // Validate coupon valid date range - belum berlaku
    if (now < coupon.validFrom) {
      return NextResponse.json(
        {
          success: false,
          message: `Kupon ini baru dapat digunakan mulai tanggal ${coupon.validFrom.toLocaleDateString("id-ID")}`,
        },
        { status: 400 },
      );
    }

    // Validate coupon valid date range - sudah expired
    if (now > coupon.validUntil) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon promosi ini telah kadaluarsa",
        },
        { status: 400 },
      );
    }

    // Validate usage limit global tidak exceed
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        {
          success: false,
          message: "Kuota penggunaan kupon ini telah habis",
        },
        { status: 400 },
      );
    }

    // Check user usage count untuk coupon ini
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    // Validate user usage tidak exceed limit
    if (userUsageCount >= coupon.usagePerUser) {
      return NextResponse.json(
        {
          success: false,
          message: `Anda telah mencapai batas maksimal penggunaan kupon ini (${coupon.usagePerUser}x pakai)`,
        },
        { status: 400 },
      );
    }

    // Validate minimum purchase requirement
    if (coupon.minPurchase !== null && subtotal < coupon.minPurchase) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimal belanja untuk menggunakan kupon ini adalah Rp ${coupon.minPurchase.toLocaleString("id-ID")}`,
        },
        { status: 400 },
      );
    }

    let discountAmount = 0;

    // Calculate discount berdasarkan type PERCENTAGE
    if (coupon.type === "PERCENTAGE") {
      const calculatedDiscount = (subtotal * coupon.value) / 100;
      if (
        coupon.maxDiscount !== null &&
        calculatedDiscount > coupon.maxDiscount
      ) {
        discountAmount = coupon.maxDiscount;
      } else {
        discountAmount = calculatedDiscount;
      }
    } else if (coupon.type === "FIXED") {
      // Calculate discount untuk type FIXED
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      // Calculate discount untuk type FREE_SHIPPING
      const maxShippingDiscount =
        coupon.maxDiscount || coupon.value || shippingCost;
      discountAmount = Math.min(shippingCost, maxShippingDiscount);
    }

    // Round discount amount
    discountAmount = Math.round(discountAmount);

    // Calculate final amount setelah discount
    const totalOrderAmount = subtotal + shippingCost;
    const finalAmount = Math.max(0, totalOrderAmount - discountAmount);

    // Return response dengan coupon dan calculation details
    return NextResponse.json({
      success: true,
      message: "Kupon berhasil diterapkan",
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
        },
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
    // Handle validation errors
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
    // Handle auth errors
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

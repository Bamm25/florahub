import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateCouponSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP POST untuk memvalidasi kupon diskon dan menghitung potongan harga
export async function POST(request: Request) {
  try {
    // Validasi sesi pengguna dan parse muatan permintaan
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const validated = validateCouponSchema.parse(body);
    const { code, subtotal, shippingCost = 0 } = validated;

    // Normalisasi kode kupon menjadi huruf kapital
    const normalizedCode = code.trim().toUpperCase();

    // Cari data kupon berdasarkan kode unik
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    // Validasi keberadaan kupon di basis data
    if (!coupon) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode kupon tidak ditemukan atau tidak valid",
        },
        { status: 404 },
      );
    }

    // Pastikan status kupon masih aktif
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
    // Validasi periode kupon jika masa berlakunya belum dimulai
    if (now < coupon.validFrom) {
      return NextResponse.json(
        {
          success: false,
          message: `Kupon ini baru dapat digunakan mulai tanggal ${coupon.validFrom.toLocaleDateString("id-ID")}`,
        },
        { status: 400 },
      );
    }

    // Validasi periode kupon jika sudah kedaluwarsa
    if (now > coupon.validUntil) {
      return NextResponse.json(
        {
          success: false,
          message: "Kupon promosi ini telah kadaluarsa",
        },
        { status: 400 },
      );
    }

    // Validasi apakah kuota penggunaan global kupon sudah tercapai
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        {
          success: false,
          message: "Kuota penggunaan kupon ini telah habis",
        },
        { status: 400 },
      );
    }

    // Hitung riwayat frekuensi pemakaian kupon oleh pengguna saat ini
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    // Validasi batasan kuota pemakaian per pengguna
    if (userUsageCount >= coupon.usagePerUser) {
      return NextResponse.json(
        {
          success: false,
          message: `Anda telah mencapai batas maksimal penggunaan kupon ini (${coupon.usagePerUser}x pakai)`,
        },
        { status: 400 },
      );
    }

    // Validasi syarat minimum nominal belanja
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

    // Hitung potongan harga untuk jenis diskon persentase
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
      // Hitung potongan harga untuk jenis potongan nominal tetap
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      // Hitung potongan biaya pengiriman untuk jenis gratis ongkir
      const maxShippingDiscount =
        coupon.maxDiscount || coupon.value || shippingCost;
      discountAmount = Math.min(shippingCost, maxShippingDiscount);
    }

    // Bulatkan hasil perhitungan nilai diskon
    discountAmount = Math.round(discountAmount);

    // Hitung total akhir pembayaran setelah dipotong diskon
    const totalOrderAmount = subtotal + shippingCost;
    const finalAmount = Math.max(0, totalOrderAmount - discountAmount);

    // Kirim respons berhasil beserta rincian kalkulasi kupon
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
    // Tangani galat validasi skema masukan
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

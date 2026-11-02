import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);
    const { addressId, shippingCost, couponCode, notes, items } = validatedData;

    // Validasi items dari frontend
    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Keranjang kosong",
        },
        { status: 400 },
      );
    }

    // Fetch product details dari database untuk validasi
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        floristId: true,
      },
    });

    // Validasi setiap item
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `Produk tidak ditemukan`,
          },
          { status: 404 },
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: `Produk tidak aktif: ${product.name}`,
          },
          { status: 400 },
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Stok tidak cukup: ${product.name}. Tersedia: ${product.stock}`,
          },
          { status: 400 },
        );
      }
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: {
        orderNumber: "desc",
      },
    });

    let sequance = 1;
    if (lastOrder) {
      const lastSequance = parseInt(lastOrder.orderNumber.slice(-3));
      sequance = lastSequance + 1;
    }

    const orderNumber = `ORD-${dateStr}-${sequance.toString().padStart(3, "0")}`;

    // Hitung subtotal dari items yang dikirim frontend
    const subtotal = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    let discount = 0;
    let appliedCoupon = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();

      // Cari kupon berdasarkan kode
      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode },
      });

      if (!coupon) {
        return NextResponse.json(
          {
            success: false,
            message: `Kode kupon "${normalizedCode}" tidak ditemukan`,
          },
          { status: 404 },
        );
      }

      if (!coupon.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: "Kupon sudah tidak aktif",
          },
          { status: 400 },
        );
      }

      const now = new Date();
      if (now < coupon.validFrom) {
        return NextResponse.json(
          {
            success: false,
            message: `Kupon belum berlaku. Mulai berlaku: ${coupon.validFrom.toLocaleDateString("id-ID")}`,
          },
          { status: 400 },
        );
      }

      if (now > coupon.validUntil) {
        return NextResponse.json(
          {
            success: false,
            message: "Kupon sudah kadaluarsa",
          },
          { status: 400 },
        );
      }

      if (coupon.minPurchase && subtotal < coupon.minPurchase) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimal belanja Rp ${coupon.minPurchase.toLocaleString("id-ID")} untuk menggunakan kupon ini`,
          },
          { status: 400 },
        );
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return NextResponse.json(
          {
            success: false,
            message: "Kupon sudah habis digunakan",
          },
          { status: 400 },
        );
      }

      const userUsageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userUsageCount >= coupon.usagePerUser) {
        return NextResponse.json(
          {
            success: false,
            message: `Anda sudah mencapai batas penggunaan kupon ini (${coupon.usagePerUser}x)`,
          },
          { status: 400 },
        );
      }

      if (coupon.type === "PERCENTAGE") {
        const rawDiscount = (subtotal * coupon.value) / 100;
        discount = Math.round(rawDiscount);

        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }

        if (discount > subtotal) {
          discount = subtotal;
        }
      } else if (coupon.type === "FIXED") {
        discount = Math.round(coupon.value);

        if (discount > subtotal) {
          discount = subtotal;
        }
      } else if (coupon.type === "FREE_SHIPPING") {
        const maxShippingDiscount = coupon.maxDiscount || shippingCost;
        discount = Math.min(shippingCost, maxShippingDiscount);
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Tipe kupon tidak valid: ${coupon.type}`,
          },
          { status: 400 },
        );
      }

      // Coupon applied successfully
      appliedCoupon = coupon;
    }

    const totalAmount = subtotal + shippingCost - discount;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        addressId: addressId || null,
        subtotal,
        shippingCost,
        discount,
        totalAmount,
        status: "PENDING",
        notes: notes || null,

        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
        },
        payment: {
          create: {
            amount: totalAmount,
            method: "pending",
            status: "PENDING",
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        payment: true,
        address: true,
      },
    });

    if (appliedCoupon) {
      await prisma.$transaction([
        prisma.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            orderId: order.id,
            userId,
            discount,
          },
        }),
        prisma.coupon.update({
          where: { id: appliedCoupon.id },
          data: {
            usageCount: { increment: 1 },
          },
        }),
      ]);
    }

    // Cart di-manage oleh frontend (localStorage), tidak perlu hapus dari database

    return NextResponse.json(
      {
        success: true,
        message: appliedCoupon
          ? `Order berhasil dibuat dengan diskon ${appliedCoupon.code}`
          : "Order berhasil dibuat",
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            discount: order.discount,
            status: order.status,
            notes: order.notes,
            createdAt: order.createdAt,
            items: order.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              product: {
                id: item.product.id,
                name: item.product.name,
                image: item.product.image,
              },
            })),
            address: order.address,
            couponApplied: appliedCoupon
              ? {
                  code: appliedCoupon.code,
                  name: appliedCoupon.name,
                  type: appliedCoupon.type,
                  discountAmount: discount,
                }
              : null,
          },
          payment: {
            id: order.payment!.id,
            amount: order.payment!.amount,
            status: order.payment!.status,
            method: order.payment!.method,
          },
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error?.name === "ZodError" || error?.issues) {
      console.error("Zod validation error checkout:", error.issues);
      return NextResponse.json(
        {
          success: false,
          message: "Data checkout tidak valid",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    console.error("Error checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal membuat order",
      },
      { status: 500 },
    );
  }
}

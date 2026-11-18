import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { isPrismaUniqueError } from "@/lib/prisma-errors";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import {
  applyCouponAtomicallyInTx,
  CouponValidationError,
  validateAndCalculateCoupon,
} from "@/lib/coupons";
import {
  calculateB2CShippingQuotes,
  ShippingQuoteError,
} from "@/lib/shipping-rates";
import { formatRupiah } from "@/lib/utils/formatters";
import { checkoutSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk memproses transaksi checkout dan pembuatan pesanan baru
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);
    const { addressId, shippingCost, courier, service, couponCode, notes, items } =
      validatedData;

    const productIds = items.map((item) => item.productId);
    if (new Set(productIds).size !== items.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplikat item produk dalam permintaan checkout",
        },
        { status: 400 },
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        floristId: true,
        categoryId: true,
      },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, message: "Produk tidak ditemukan" },
          { status: 404 },
        );
      }
      if (!product.isActive) {
        return NextResponse.json(
          { success: false, message: `Produk tidak aktif: ${product.name}` },
          { status: 400 },
        );
      }
      if (item.price !== product.price) {
        return NextResponse.json(
          {
            success: false,
            message: `Harga produk "${product.name}" tidak sesuai katalog`,
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

    // Verifikasi kepemilikan alamat, batasan toko florist tunggal, & hitung tarif kurir otoritatif di server
    const shippingQuote = await calculateB2CShippingQuotes({
      userId,
      addressId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    let verifiedShippingCost: number;
    if (courier && service) {
      const matchedRate = shippingQuote.rates.find(
        (rate) =>
          rate.courier.toLowerCase() === courier.trim().toLowerCase() &&
          rate.service.toLowerCase() === service.trim().toLowerCase(),
      );
      if (!matchedRate) {
        return NextResponse.json(
          {
            success: false,
            message: "Opsi layanan pengiriman yang dipilih tidak valid",
          },
          { status: 400 },
        );
      }
      verifiedShippingCost = matchedRate.price;
    } else {
      const priceMatched = shippingQuote.rates.find(
        (rate) => rate.price === shippingCost,
      );
      if (!priceMatched) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ongkos kirim tidak sesuai tarif kurir resmi. Silakan hitung ulang ongkir.",
          },
          { status: 400 },
        );
      }
      verifiedShippingCost = priceMatched.price;
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: `ORD-${dateStr}` } },
      orderBy: { orderNumber: "desc" },
    });

    let sequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split("-");
      if (parts.length >= 3) {
        const parsed = Number.parseInt(parts[2], 10);
        if (!Number.isNaN(parsed)) sequence = parsed + 1;
      }
    }
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNumber = `ORD-${dateStr}-${sequence.toString().padStart(3, "0")}-${randomSuffix}`;

    const subtotal = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    let discount = 0;
    let appliedCoupon: Awaited<
      ReturnType<typeof validateAndCalculateCoupon>
    >["coupon"] | null = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const couponResult = await validateAndCalculateCoupon(prisma, {
        code: couponCode,
        userId,
        subtotal,
        shippingCost: verifiedShippingCost,
        productIds,
        categoryIds: [...new Set(products.map((p) => p.categoryId))],
      });
      appliedCoupon = couponResult.coupon;
      discount = couponResult.discountAmount;
    }

    const totalAmount = Math.max(0, subtotal + verifiedShippingCost - discount);
    const isZeroTotal = totalAmount === 0;
    const paidAtNow = isZeroTotal ? new Date() : null;

    const { order, lowStockAlerts } = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            isActive: true,
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          const currentProd = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stock: true },
          });
          throw new Error(
            `INSUFFICIENT_STOCK:${currentProd?.name || item.productId}:${currentProd?.stock ?? 0}`,
          );
        }
      }

      const updatedProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, stock: true, floristId: true },
      });

      const alerts = updatedProducts
        .filter((p) => p.stock < PRODUCT_LOW_STOCK_THRESHOLD && p.stock >= 0)
        .map((p) => ({
          floristId: p.floristId,
          productName: p.name,
          remainingStock: p.stock,
        }));

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          subtotal,
          shippingCost: verifiedShippingCost,
          discount,
          totalAmount,
          status: isZeroTotal ? "PAID" : "PENDING",
          notes: notes || null,
          items: {
            create: items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
                subtotal: product.price * item.quantity,
              };
            }),
          },
          payment: {
            create: {
              amount: totalAmount,
              method: isZeroTotal ? "coupon" : "pending",
              status: isZeroTotal ? "PAID" : "PENDING",
              paidAt: paidAtNow,
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
        await applyCouponAtomicallyInTx(tx, {
          couponId: appliedCoupon.id,
          orderId: createdOrder.id,
          userId,
          discount,
        });
      }

      return { order: createdOrder, lowStockAlerts: alerts };
    });

    if (lowStockAlerts.length > 0) {
      const floristAlertIds = [...new Set(lowStockAlerts.map((a) => a.floristId))];
      const existingAlerts = await prisma.notification.findMany({
        where: {
          userId: { in: floristAlertIds },
          type: "LOW_STOCK_ALERT",
          isRead: false,
        },
        select: { userId: true, message: true },
      });

      const alertsToCreate = lowStockAlerts.filter(
        (alert) =>
          !existingAlerts.some(
            (existing) =>
              existing.userId === alert.floristId &&
              existing.message.includes(alert.productName),
          ),
      );

      if (alertsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: alertsToCreate.map((alert) => ({
            userId: alert.floristId,
            title: "Peringatan Stok Rendah!",
            message: `Stok produk "${alert.productName}" hanya tersisa ${alert.remainingStock} unit. Segera lakukan restock untuk menghindari kehabisan stok.`,
            type: "LOW_STOCK_ALERT" as const,
            link: `/florist/products`,
            isRead: false,
          })),
        });
      }
    }

    const floristIds = [...new Set(products.map((p) => p.floristId))];
    if (floristIds.length > 0) {
      await prisma.notification.createMany({
        data: floristIds.map((floristId) => ({
          userId: floristId,
          title: "Pesanan Baru Masuk!",
          message: `Order #${order.orderNumber} telah masuk dengan total ${formatRupiah(order.totalAmount)}. Segera proses pesanan.`,
          type: "ORDER_CREATED" as const,
          link: `/florist/orders`,
          isRead: false,
        })),
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        title: "Pesanan Dibuat!",
        message: isZeroTotal
          ? `Pesanan #${order.orderNumber} berhasil dibuat dan lunas menggunakan kupon promosi.`
          : `Pesanan #${order.orderNumber} berhasil dibuat. Lanjutkan pembayaran untuk diproses florist.`,
        type: "ORDER_CREATED",
        link: `/orders/${order.id}`,
      },
    });

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
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (
      error instanceof CouponValidationError ||
      error instanceof ShippingQuoteError
    ) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Error &&
      error.message.startsWith("INSUFFICIENT_STOCK:")
    ) {
      const [, productName, remaining] = error.message.split(":");
      return NextResponse.json(
        {
          success: false,
          message: `Stok produk "${productName}" tidak mencukupi (tersisa ${remaining})`,
        },
        { status: 400 },
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError" &&
      "issues" in error
    ) {
      reportServerError("Zod validation error checkout:");
      return NextResponse.json(
        {
          success: false,
          message: "Data checkout tidak valid",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Terjadi benturan nomor pesanan. Silakan coba kembali.",
        },
        { status: 409 },
      );
    }
    reportServerError("Error checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat order",
      },
      { status: 500 },
    );
  }
}

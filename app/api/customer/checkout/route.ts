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

      // Validasi integritas harga terhadap katalog database
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

    // Validasi ongkos kirim jika pengiriman ke alamat
    if (addressId && shippingCost <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Ongkos kirim wajib diisi untuk pengiriman ke alamat",
        },
        { status: 400 },
      );
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
      const parts = lastOrder.orderNumber.split("-");
      if (parts.length >= 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          sequance = parsed + 1;
        }
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNumber = `ORD-${dateStr}-${sequance.toString().padStart(3, "0")}-${randomSuffix}`;

    // Hitung subtotal authoritative dari database product price
    const subtotal = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const price = product ? product.price : item.price;
      return sum + price * item.quantity;
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

    // Gunakan transaction untuk atomisitas: verifikasi dan kurangi stok, buat order, catat kupon
    const { order, lowStockAlerts } = await prisma.$transaction(async (tx) => {
      const alerts: { floristId: string; productName: string; remainingStock: number }[] = [];

      for (const item of items) {
        // Atomic decrement dengan verifikasi ketersediaan stok di level database query
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            isActive: true,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updateResult.count === 0) {
          const currentProd = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stock: true },
          });
          throw new Error(
            `INSUFFICIENT_STOCK:${currentProd?.name || item.productId}:${currentProd?.stock ?? 0}`
          );
        }

        const updatedProd = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            stock: true,
            floristId: true,
          },
        });

        // Trigger peringatan stok rendah jika stok berada di bawah ambang batas (10 unit)
        const LOW_STOCK_THRESHOLD = 10;
        if (updatedProd && updatedProd.stock < LOW_STOCK_THRESHOLD && updatedProd.stock >= 0) {
          alerts.push({
            floristId: updatedProd.floristId,
            productName: updatedProd.name,
            remainingStock: updatedProd.stock,
          });
        }
      }

      const createdOrder = await tx.order.create({
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
        await tx.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            orderId: createdOrder.id,
            userId,
            discount,
          },
        });
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }

      return { order: createdOrder, lowStockAlerts: alerts };
    });

    // Kirim notifikasi stok rendah ke florist terkait jika belum ada notifikasi yang belum dibaca
    for (const alert of lowStockAlerts) {
      const existingAlert = await prisma.notification.findFirst({
        where: {
          userId: alert.floristId,
          type: "LOW_STOCK_ALERT",
          isRead: false,
          message: { contains: alert.productName },
        },
      });

      if (!existingAlert) {
        await prisma.notification.create({
          data: {
            userId: alert.floristId,
            title: "Peringatan Stok Rendah!",
            message: `Stok produk "${alert.productName}" hanya tersisa ${alert.remainingStock} unit. Segera lakukan restock untuk menghindari kehabisan stok.`,
            type: "LOW_STOCK_ALERT",
            link: `/florist/products`,
            isRead: false,
          },
        });
      }
    }

    // Notify each unique florist about the new order
    const floristIds = [...new Set(products.map((p) => p.floristId))];
    if (floristIds.length > 0) {
      await prisma.notification.createMany({
        data: floristIds.map((floristId) => ({
          userId: floristId,
          title: "Pesanan Baru Masuk!",
          message: `Order #${order.orderNumber} telah masuk dengan total Rp ${order.totalAmount.toLocaleString("id-ID")}. Segera proses pesanan.`,
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
        message: `Pesanan #${order.orderNumber} berhasil dibuat. Lanjutkan pembayaran untuk diproses florist.`,
        type: "ORDER_CREATED",
        link: `/orders/${order.id}`,
      },
    });

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
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      const [, productName, remaining] = error.message.split(":");
      return NextResponse.json(
        {
          success: false,
          message: `Stok produk "${productName}" tidak mencukupi (tersisa ${remaining})`,
        },
        { status: 400 },
      );
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError" && 'issues' in error) {
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
    if (error && typeof error === 'object' && ('code' in error && error.code === 'P2002' || (error instanceof Error && error.message.includes('Unique constraint failed')))) {
      return NextResponse.json(
        {
          success: false,
          message: "Terjadi benturan nomor pesanan. Silakan coba kembali.",
        },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Gagal membuat order";
    console.error("Error checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

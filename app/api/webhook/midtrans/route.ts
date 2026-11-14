import prisma from "@/lib/prisma";
import crypto from "crypto";
import { settlePreorder, settleStock } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";

// Handler HTTP POST webhook untuk memproses notifikasi pembayaran dari Midtrans
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_id,
      transaction_status,
      transaction_id,
      gross_amount,
      signature_key,
      status_code,
      payment_type,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return NextResponse.json({ success: false, message: "Midtrans not configured" }, { status: 503 });
    if (typeof order_id !== "string" || typeof status_code !== "string" ||
        typeof gross_amount !== "string" || typeof signature_key !== "string" ||
        !/^[a-f0-9]{128}$/.test(signature_key)) {
      return NextResponse.json({ success: false, message: "Invalid notification" }, { status: 400 });
    }

    // Verifikasi validitas kunci tanda tangan SHA512 dari Midtrans
    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature_key, "hex"), Buffer.from(expectedSignature, "hex"))) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid signature",
        },
        { status: 403 },
      );
    }

    // Pre-order and ready-stock payments have distinct namespaces.
    const match = /^(DP|FINAL|STOCK)_([a-z0-9]{25})_[a-zA-Z0-9_]+$/.exec(order_id);
    if (match) {
      const [, kind, id] = match;
      const payment = { order_id, transaction_id, transaction_status, fraud_status: body.fraud_status, gross_amount };
      if (typeof transaction_id !== "string" || !transaction_id) return NextResponse.json({ success: false, message: "Missing transaction ID" }, { status: 400 });
      const result = kind === "STOCK"
        ? await settleStock(payment, id)
        : await settlePreorder(payment, kind as "DP" | "FINAL", id);
      if (!result.changed && result.reason !== "Payment not settled" && result.reason !== "Already processed") {
        console.error("Midtrans payment requires reconciliation", { order_id, reason: result.reason });
        return NextResponse.json({ success: false, message: result.reason }, { status: 409 });
      }
      return NextResponse.json({ success: true, message: result.reason });
    }
    if (/^(DP|FINAL|STOCK)_/.test(order_id)) return NextResponse.json({ success: false, message: "Invalid payment order ID" }, { status: 400 });

    // Cari data pesanan berdasarkan nomor pesanan
    const order = await prisma.order.findFirst({
      where: { orderNumber: order_id },
      include: {
        payment: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi kesesuaian gross_amount callback dengan total order
    const receivedGross = Math.round(parseFloat(gross_amount));
    if (!Number.isFinite(receivedGross) || receivedGross !== order.totalAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Gross amount mismatch: expected ${order.totalAmount}, got ${receivedGross}`,
        },
        { status: 400 },
      );
    }

    if (
      transaction_status === "settlement" ||
      transaction_status === "capture" && body.fraud_status === "accept"
    ) {
      // Eksekusi transisi status secara atomic untuk mencegah duplicate notification & late settlement
      const transitionResult = await prisma.$transaction(async (tx) => {
        // Hanya order dengan status PENDING yang dapat berubah menjadi PAID
        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "PENDING",
          },
          data: {
            status: "PAID",
          },
        });

        // Jika order sudah bukan PENDING (sudah PAID atau sudah CANCELLED), abaikan mutasi
        if (updateResult.count === 0) {
          return { shouldNotify: false };
        }

        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            status: "PAID",
            method: payment_type || "midtrans",
            transactionId: transaction_id,
            paidAt: new Date(),
          },
        });

        return { shouldNotify: true };
      });

      // Kirim notifikasi hanya jika order berhasil ditransisikan dari PENDING ke PAID
      if (transitionResult.shouldNotify) {
        const floristMap = await prisma.product.findMany({
          where: { id: { in: order.items.map((i: { productId: string }) => i.productId) } },
          select: { floristId: true },
          distinct: ["floristId"],
        });
        const uniqueFloristIds = floristMap.map((p: { floristId: string }) => p.floristId);
        if (uniqueFloristIds.length > 0) {
          await prisma.notification.createMany({
            data: uniqueFloristIds.map((floristId: string) => ({
              userId: floristId,
              title: "Pembayaran Diterima!",
              message: `Order #${order.orderNumber} telah dibayar. Segera proses dan kirimkan pesanan.`,
              type: "PAYMENT_SUCCESS" as const,
              link: `/florist/orders`,
              isRead: false,
            })),
          });
        }

        await prisma.notification.create({
          data: {
            userId: order.userId,
            title: "Pembayaran Berhasil!",
            message: `Pembayaran untuk order #${order.orderNumber} telah berhasil dikonfirmasi. Pesanan Anda sedang diproses.`,
            type: "PAYMENT_SUCCESS",
            link: `/orders/${order.id}`,
            isRead: false,
          },
        });
      }
    } else if (
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      // Perbarui status pembayaran menjadi gagal dan kembalikan kuota stok pesanan
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: {
            status: "FAILED",
          },
        });

        // Kembalikan reserved stock HANYA jika status order masih PENDING
        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
            cancelReason: `Payment ${transaction_status}`,
          },
        });

        if (updateResult.count > 0) {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

import prisma from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

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

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";

    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid signature",
        },
        { status: 403 },
      );
    }

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
    if (receivedGross !== order.totalAmount) {
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
      transaction_status === "capture"
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
      await prisma.$transaction(async (tx: any) => {
        await tx.payment.updateMany({
          where: { orderId: order.id },
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

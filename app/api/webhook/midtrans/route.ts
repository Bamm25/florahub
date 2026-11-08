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

    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: "PAID",
          method: payment_type || "midtrans",
          transactionId: transaction_id,
          paidAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
        },
      });

      // Update stock and check for low stock alerts
      for (const item of order.items) {
        const updatedProduct = await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
          select: {
            id: true,
            name: true,
            stock: true,
            floristId: true,
          },
        });

        // Trigger low stock alert if stock falls below threshold (10 units)
        const LOW_STOCK_THRESHOLD = 10;
        if (updatedProduct.stock < LOW_STOCK_THRESHOLD && updatedProduct.stock >= 0) {
          // Check if there's already an unread low stock alert for this product
          const existingAlert = await prisma.notification.findFirst({
            where: {
              userId: updatedProduct.floristId,
              type: "LOW_STOCK_ALERT",
              isRead: false,
              message: { contains: updatedProduct.name },
            },
          });

          if (!existingAlert) {
            await prisma.notification.create({
              data: {
                userId: updatedProduct.floristId,
                title: "Peringatan Stok Rendah!",
                message: `Stok produk "${updatedProduct.name}" hanya tersisa ${updatedProduct.stock} unit. Segera lakukan restock untuk menghindari kehabisan stok.`,
                type: "LOW_STOCK_ALERT",
                link: `/florist/products`,
                isRead: false,
              },
            });
          }
        }
      }

      // Notify each unique florist about successful payment
      const floristMap = await prisma.product.findMany({
        where: { id: { in: order.items.map((i) => i.productId) } },
        select: { floristId: true },
        distinct: ["floristId"],
      });
      const uniqueFloristIds = floristMap.map((p) => p.floristId);
      if (uniqueFloristIds.length > 0) {
        await prisma.notification.createMany({
          data: uniqueFloristIds.map((floristId) => ({
            userId: floristId,
            title: "Pembayaran Diterima!",
            message: `Order #${order.orderNumber} telah dibayar. Segera proses dan kirimkan pesanan.`,
            type: "PAYMENT_SUCCESS" as const,
            link: `/florist/orders`,
            isRead: false,
          })),
        });
      }

      // Notify customer about payment success
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: "Pembayaran Berhasil!",
          message: `Pembayaran untuk order #${order.orderNumber} telah berhasil dikonfirmasi. Pesanan Anda sedang diproses.`,
          type: "PAYMENT_SUCCESS",
          link: `/customer/orders`,
          isRead: false,
        },
      });
    } else if (
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: "FAILED",
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelReason: `Payment ${transaction_status}`,
        },
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

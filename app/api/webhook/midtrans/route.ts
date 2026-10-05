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

      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
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

import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createPaymentSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// POST: Create Midtrans payment link untuk order
export async function POST(request: Request) {
  try {
    // Validate user session dan parse request body
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validated = createPaymentSchema.parse(body);
    const { orderId } = validated;

    // Query order dengan items, payment, dan user details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payment: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Validate order existence
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validate order ownership
    if (order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Validate payment data existence
    if (!order.payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pembayaran tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validate payment belum dibayar
    if (order.payment.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Order ini sudah dibayar",
        },
        { status: 400 },
      );
    }

    // Build item details untuk Midtrans
    const itemDetails = order.items.map((item) => ({
      id: item.product.id,
      price: item.price,
      quantity: item.quantity,
      name: item.product.name,
    }));

    // Add shipping cost ke item details
    if (order.shippingCost > 0) {
      itemDetails.push({
        id: "SHIPPING",
        price: order.shippingCost,
        quantity: 1,
        name: "Ongkos Kirim",
      });
    }

    // Add discount sebagai item negatif untuk Midtrans validation
    if (order.discount > 0) {
      itemDetails.push({
        id: "DISCOUNT",
        price: -order.discount,
        quantity: 1,
        name: "Diskon Kupon",
      });
    }

    // Create Midtrans transaction
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: order.totalAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: order.user.name || "",
        email: order.user.email || "",
        phone: order.user.phone || "",
      },
    });

    // Update payment dengan transaction details
    await prisma.payment.update({
      where: { orderId },
      data: {
        method: "midtrans",
        transactionId: order.orderNumber,
        paymentUrl: transaction.redirect_url,
      },
    });

    // Return response dengan payment token dan URL
    return NextResponse.json({
      success: true,
      message: "Link pembayaran berhasil dibuat",
      data: {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
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
        message: "Gagal membuat link pembayaran",
      },
      { status: 500 },
    );
  }
}

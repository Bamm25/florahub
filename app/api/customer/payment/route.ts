import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID wajib diisi",
        },
        { status: 400 },
      );
    }

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

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    if (!order.payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pembayaran tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (order.payment.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Order ini sudah dibayar",
        },
        { status: 400 },
      );
    }

    const itemDetails = order.items.map((item) => ({
      id: item.product.id,
      price: item.price,
      quantity: item.quantity,
      name: item.product.name,
    }));

    if (order.shippingCost > 0) {
      itemDetails.push({
        id: "SHIPPING",
        price: order.shippingCost,
        quantity: 1,
        name: "Ongkos Kirim",
      });
    }

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

    await prisma.payment.update({
      where: { orderId },
      data: {
        method: "midtrans",
        transactionId: order.orderNumber,
        paymentUrl: transaction.redirect_url,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Link pembayaran berhasil dibuat",
      data: {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
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

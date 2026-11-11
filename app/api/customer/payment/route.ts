import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createPaymentSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP POST untuk membuat tautan pembayaran Midtrans bagi pesanan
export async function POST(request: Request) {
  try {
    // Validasi sesi pengguna dan parse muatan permintaan
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validated = createPaymentSchema.parse(body);
    const { orderId } = validated;

    // Ambil data pesanan beserta relasi item produk, pembayaran, dan informasi pelanggan
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

    // Validasi keberadaan data pesanan
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pesanan oleh pengguna
    if (order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Validasi keberadaan catatan data pembayaran
    if (!order.payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pembayaran tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Pastikan pesanan belum pernah dibayar sebelumnya
    if (order.payment.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Order ini sudah dibayar",
        },
        { status: 400 },
      );
    }

    // Susun daftar rincian item pesanan untuk payload Midtrans
    const itemDetails = order.items.map((item) => ({
      id: item.product.id,
      price: item.price,
      quantity: item.quantity,
      name: item.product.name,
    }));

    // Tambahkan biaya pengiriman ke dalam daftar rincian transaksi
    if (order.shippingCost > 0) {
      itemDetails.push({
        id: "SHIPPING",
        price: order.shippingCost,
        quantity: 1,
        name: "Ongkos Kirim",
      });
    }

    // Tambahkan nilai diskon kupon sebagai pengurang harga transaksi
    if (order.discount > 0) {
      itemDetails.push({
        id: "DISCOUNT",
        price: -order.discount,
        quantity: 1,
        name: "Diskon Kupon",
      });
    }

    // Buat sesi transaksi pembayaran melalui Midtrans Snap
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

    // Perbarui data pembayaran dengan token dan URL pengalihan Midtrans
    await prisma.payment.update({
      where: { orderId },
      data: {
        method: "midtrans",
        transactionId: order.orderNumber,
        paymentUrl: transaction.redirect_url,
      },
    });

    // Kirim respons berhasil beserta token transaksi dan URL pembayaran
    return NextResponse.json({
      success: true,
      message: "Link pembayaran berhasil dibuat",
      data: {
        token: transaction.token,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
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
        message: "Gagal membuat link pembayaran",
      },
      { status: 500 },
    );
  }
}

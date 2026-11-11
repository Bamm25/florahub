import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil detail pesanan pelanggan berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi sesi pengguna dan ambil ID pesanan dari parameter rute
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;
    // Validasi keberadaan parameter ID pesanan
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID tidak ditemukan",
        },
        { status: 400 },
      );
    }

    // Ambil data pesanan lengkap beserta relasi produk, alamat, pengiriman, dan pembayaran
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                category: true,
              },
            },
          },
        },
        payment: true,
        address: true,
        shipment: true,
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

    // Transformasi data pesanan ke dalam format respons klien
    const orderDetail = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      notes: order.notes,

      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      totalAmount: order.totalAmount,

      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        product: {
          id: item.product.id,
          name: item.product.name,
          image: item.product.image,
          currentPrice: item.product.price,
        },
      })),

      address: order.address,
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            courier: order.shipment.courier,
            service: order.shipment.service,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            estimatedDays: order.shipment.estimatedDays,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
          }
        : null,
      payment: order.payment
        ? {
            id: order.payment.id,
            amount: order.payment.amount,
            method: order.payment.method,
            status: order.payment.status,
            transactionId: order.payment.transactionId,
            paidAt: order.payment.paidAt,
          }
        : null,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    // Kirim respons data detail pesanan lengkap
    return NextResponse.json({
      success: true,
      message: "Detail order berhasil diambil",
      data: {
        order: orderDetail,
      },
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail order",
      },
      { status: 500 },
    );
  }
}

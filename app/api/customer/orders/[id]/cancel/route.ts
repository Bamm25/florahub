import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk membatalkan pesanan berstatus PENDING dan mengembalikan kuota stok
export async function POST(
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
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 },
      );
    }

    // Ambil data pesanan beserta item produk untuk pemulihan stok
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, stock: true } },
          },
        },
      },
    });

    // Validasi keberadaan data pesanan
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pesanan oleh pengguna
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Order ini bukan milik Anda" },
        { status: 403 },
      );
    }

    // Pastikan pesanan masih berstatus PENDING sebelum dibatalkan
    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya pesanan dengan status PENDING yang dapat dibatalkan",
        },
        { status: 400 },
      );
    }

    // Eksekusi pembatalan pesanan dan pemulihan stok dalam transaksi basis data
    await prisma.$transaction(async (tx) => {
      // Perbarui status pesanan menjadi CANCELLED
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Perbarui status pembayaran menjadi FAILED
      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: "FAILED" },
      });

      // Kembalikan stok untuk setiap item produk dalam pesanan
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    // Kirim respons berhasil pembatalan pesanan
    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil dibatalkan dan stok telah dikembalikan",
      data: { orderId: id },
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("[CANCEL ORDER ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal membatalkan pesanan" },
      { status: 500 },
    );
  }
}

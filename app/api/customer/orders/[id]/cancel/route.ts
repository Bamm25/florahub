import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { releaseCouponUsageInTx } from "@/lib/coupons";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP POST atomik untuk membatalkan pesanan berstatus PENDING dan mengembalikan kuota stok & kupon
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          select: { productId: true, quantity: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Order ini bukan milik Anda" },
        { status: 403 },
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya pesanan dengan status PENDING yang dapat dibatalkan",
        },
        { status: 400 },
      );
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      // Transisi kondisional atomik mencegah race condition double-restock atau menimpa pesanan yang sudah PAID
      const transitioned = await tx.order.updateMany({
        where: { id, userId, status: "PENDING" },
        data: {
          status: "CANCELLED",
          cancelReason: "Dibatalkan oleh pelanggan",
        },
      });

      if (transitioned.count === 0) {
        return false;
      }

      await tx.payment.updateMany({
        where: { orderId: id, status: "PENDING" },
        data: { status: "FAILED" },
      });

      await Promise.all(
        order.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );

      await releaseCouponUsageInTx(tx, id);
      return true;
    });

    if (!cancelled) {
      return NextResponse.json(
        {
          success: false,
          message: "Pesanan tidak lagi berstatus PENDING",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil dibatalkan dan stok telah dikembalikan",
      data: { orderId: id },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[CANCEL ORDER ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal membatalkan pesanan" },
      { status: 500 },
    );
  }
}

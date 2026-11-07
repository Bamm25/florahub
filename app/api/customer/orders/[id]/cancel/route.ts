import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: Cancel order dengan status PENDING dan return stock
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validate user session dan parse order ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Validate order ID parameter
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 },
      );
    }

    // Fetch order dengan items untuk stock restoration
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

    // Validate order existence
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validate order ownership
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Order ini bukan milik Anda" },
        { status: 403 },
      );
    }

    // Validate order status harus PENDING untuk cancel
    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya pesanan dengan status PENDING yang dapat dibatalkan",
        },
        { status: 400 },
      );
    }

    // Cancel order dan return stock dalam transaction
    await prisma.$transaction(async (tx) => {
      // Update order status ke CANCELLED
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Return stock untuk setiap item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil dibatalkan dan stok telah dikembalikan",
      data: { orderId: id },
    });
  } catch (error) {
    // Handle auth errors
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

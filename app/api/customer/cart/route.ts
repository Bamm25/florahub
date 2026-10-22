import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                image: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Keranjang kosong",
          data: {
            cart: cart || null,
            items: [],
            summary: {
              totalItems: 0,
              totalQuantity: 0,
              totalPrice: 0,
            },
          },
        },
        { status: 200 },
      );
    }

    const itemsWithSubtotal = cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: item.product,
      subtotal: item.product.price * item.quantity,
      createdAt: item.createdAt,
    }));

    const summary = {
      totalItems: cart.items.length,
      totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: itemsWithSubtotal.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      ),
    };

    return NextResponse.json(
      {
        success: true,
        message: "Keranjang berhasil diambil",
        data: {
          cart: {
            id: cart.id,
            userId: cart.userId,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
          },
          items: itemsWithSubtotal,
          summary,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data keranjang" },
      { status: 500 },
    );
  }
}

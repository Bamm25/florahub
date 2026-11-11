import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Fetch cart customer dengan semua items dan summary
export async function GET(request: Request) {
  try {
    // Validate user session dan extract user ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    // Query cart dengan items dan product details
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

    // Handle empty cart case
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

    // Calculate subtotal untuk setiap item
    const itemsWithSubtotal = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
      subtotal: item.product.price * item.quantity,
      createdAt: item.createdAt,
    }));

    // Calculate summary totals
    const summary = {
      totalItems: cart.items.length,
      totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: itemsWithSubtotal.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      ),
    };

    // Return response dengan cart, items, dan summary
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
    // Handle auth errors dan return generic error response
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data keranjang" },
      { status: 500 },
    );
  }
}

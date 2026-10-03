import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat menambah ke keranjang",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
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
    console.error("Error get cart:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data keranjang" },
      { status: 500 },
    );
  }
}

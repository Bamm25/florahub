import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { success: false, message: "Quantity minimal 1" },
        { status: 400 },
      );
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            image: true,
            isActive: true,
          },
        },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Item ini bukan milik Anda" },
        { status: 403 },
      );
    }

    if (!cartItem.product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia lagi" },
        { status: 400 },
      );
    }

    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${cartItem.product.stock}`,
        },
        { status: 400 },
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quantity berhasil diupdate",
        data: {
          ...updatedItem,
          subtotal: updatedItem.product.price * updatedItem.quantity,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error update cart item:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengupdate quantity" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const userId = (session.user as any)?.id;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Item ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${cartItem.product.name} berhasil dihapus dari keranjang`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error delete cart item:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus item dari keranjang" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateCartItemSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;
    const body = await request.json();
    const validated = updateCartItemSchema.parse(body);
    const { quantity } = validated;

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
    if (error instanceof NextResponse) {
      return error;
    }

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
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

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
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus item dari keranjang" },
      { status: 500 },
    );
  }
}

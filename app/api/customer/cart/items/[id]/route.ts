import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateCartItemSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// PATCH: Update quantity cart item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validate user session dan parse params
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;
    const body = await request.json();
    const validated = updateCartItemSchema.parse(body);
    const { quantity } = validated;

    // Query cart item dengan cart dan product details
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

    // Validate cart item existence
    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    // Validate ownership
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Item ini bukan milik Anda" },
        { status: 403 },
      );
    }

    // Validate product masih aktif
    if (!cartItem.product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia lagi" },
        { status: 400 },
      );
    }

    // Validate stock availability
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${cartItem.product.stock}`,
        },
        { status: 400 },
      );
    }

    // Update cart item quantity
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

    // Return response dengan subtotal calculation
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
    // Handle validation errors
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
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { success: false, message: "Gagal mengupdate quantity" },
      { status: 500 },
    );
  }
}

// DELETE: Remove item dari cart
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validate user session dan parse params
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Query cart item dengan cart dan product name
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

    // Validate cart item existence
    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    // Validate ownership
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Item ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Delete cart item dari database
    await prisma.cartItem.delete({
      where: { id },
    });

    // Return success response dengan product name
    return NextResponse.json(
      {
        success: true,
        message: `${cartItem.product.name} berhasil dihapus dari keranjang`,
      },
      { status: 200 },
    );
  } catch (error) {
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus item dari keranjang" },
      { status: 500 },
    );
  }
}

// Alias PUT ke PATCH untuk fleksibilitas client dan automated testing
export const PUT = PATCH;

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateCartItemSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PATCH untuk memperbarui kuantitas item dalam keranjang belanja
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi sesi pengguna dan ambil ID item dari parameter rute
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;
    const body = await request.json();
    const validated = updateCartItemSchema.parse(body);
    const { quantity } = validated;

    // Ambil detail item keranjang beserta relasi produk
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

    // Validasi keberadaan item keranjang
    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    // Validasi kepemilikan keranjang oleh pengguna
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Item ini bukan milik Anda" },
        { status: 403 },
      );
    }

    // Pastikan produk masih dalam status aktif
    if (!cartItem.product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia lagi" },
        { status: 400 },
      );
    }

    // Validasi ketersediaan kuota stok produk
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${cartItem.product.stock}`,
        },
        { status: 400 },
      );
    }

    // Perbarui kuantitas item keranjang di database
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

    // Kembalikan respons berhasil beserta kalkulasi subtotal terbaru
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
    // Tangani galat validasi skema masukan
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
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { success: false, message: "Gagal mengupdate quantity" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus item dari keranjang belanja
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi sesi pengguna dan ambil ID item dari parameter rute
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Ambil data item keranjang beserta nama produk terkait
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

    // Validasi keberadaan item keranjang
    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Item tidak ditemukan di keranjang" },
        { status: 404 },
      );
    }

    // Validasi kepemilikan keranjang oleh pengguna
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Item ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Hapus item keranjang dari basis data
    await prisma.cartItem.delete({
      where: { id },
    });

    // Kirim respons berhasil penghapusan item keranjang
    return NextResponse.json(
      {
        success: true,
        message: `${cartItem.product.name} berhasil dihapus dari keranjang`,
      },
      { status: 200 },
    );
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus item dari keranjang" },
      { status: 500 },
    );
  }
}

// Alias handler HTTP PUT ke fungsi PATCH untuk kompatibilitas klien
export const PUT = PATCH;

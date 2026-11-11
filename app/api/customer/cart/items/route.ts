import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCartItemSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP POST untuk menambahkan item ke keranjang atau memperbarui kuantitas
export async function POST(request: Request) {
  try {
    // Validasi sesi pengguna dan parse payload penambahan item
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validated = createCartItemSchema.parse(body);
    const { productId, quantity } = validated;

    // Ambil detail produk untuk keperluan validasi ketersediaan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        image: true,
        isActive: true,
      },
    });

    // Validasi keberadaan produk
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi status keaktifan produk
    if (!product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia" },
        { status: 400 },
      );
    }
    // Validasi kecukupan stok produk
    if (product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${product.stock}`,
        },
        { status: 400 },
      );
    }

    // Ambil atau buat keranjang baru untuk pengguna
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // Periksa apakah produk telah tersimpan sebelumnya di keranjang
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    let cartItem;

    // Perbarui jumlah kuantitas jika produk sudah ada dalam keranjang
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      // Validasi akumulasi kuantitas agar tidak melebihi sisa stok
      if (product.stock < newQuantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Stok tidak mencukupi. Tersedia: ${product.stock}, sudah di keranjang: ${existingItem.quantity}`,
          },
          { status: 400 },
        );
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              stock: true,
            },
          },
        },
      });
    } else {
      // Simpan item produk baru ke dalam keranjang belanja
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              stock: true,
            },
          },
        },
      });
    }

    // Kirim respons berhasil beserta data item keranjang
    return NextResponse.json(
      {
        success: true,
        message: existingItem
          ? "Quantity produk berhasil diupdate"
          : "Produk berhasil ditambahkan ke keranjang",
        data: cartItem,
      },
      { status: existingItem ? 200 : 201 },
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
      { success: false, message: "Gagal menambahkan produk ke keranjang" },
      { status: 500 },
    );
  }
}

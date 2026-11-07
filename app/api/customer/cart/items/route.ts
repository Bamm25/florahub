import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCartItemSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// POST: Create new cart item atau update quantity jika sudah ada
export async function POST(request: Request) {
  try {
    // Validate user session dan parse request body
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validated = createCartItemSchema.parse(body);
    const { productId, quantity } = validated;

    // Query product details untuk validasi
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

    // Validate product existence
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validate product availability
    if (!product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia" },
        { status: 400 },
      );
    }
    // Validate stock availability
    if (product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${product.stock}`,
        },
        { status: 400 },
      );
    }

    // Find atau create cart untuk user
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // Check jika product sudah ada di cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    let cartItem;

    // Update existing item quantity
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      // Validate total quantity tidak melebihi stock
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
      // Create new cart item
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

    // Return response dengan cart item data
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
      { success: false, message: "Gagal menambahkan produk ke keranjang" },
      { status: 500 },
    );
  }
}

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (typeof productId !== "string" || productId.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID wajib diisi",
        },
        { status: 400 },
      );
    }

    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity minimal 1",
        },
        { status: 400 },
      );
    }

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

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, message: "Produk tidak tersedia" },
        { status: 400 },
      );
    }
    if (product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${product.stock}`,
        },
        { status: 400 },
      );
    }

    const userId = (session.user as any)?.id;

    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

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
    console.error("Error add to cart:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan produk ke keranjang" },
      { status: 500 },
    );
  }
}

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * PATCH /api/customer/cart/items/[id]
 * Update quantity of cart item
 * 
 * Schema yang dipakai:
 * - CartItem: { id, cartId, productId, quantity }
 * - Product: { stock } → untuk validasi stock availability
 * 
 * Body: { quantity: number }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. CHECK AUTH
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

    // 2. CHECK ROLE
    const userRole = (session.user as any)?.role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat mengupdate keranjang",
        },
        { status: 403 },
      );
    }

    // 3. GET PARAMS (Next.js 15: params is Promise!)
    const { id } = await params;

    // 4. PARSE BODY
    const body = await request.json();
    const { quantity } = body;

    // 5. VALIDATE INPUT
    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity minimal 1",
        },
        { status: 400 },
      );
    }

    const userId = (session.user as any)?.id;

    // 6. GET CART ITEM (dengan product untuk check stock)
    /**
     * PENJELASAN QUERY:
     * - Include cart untuk verify ownership (pastikan item ini milik user)
     * - Include product untuk check stock availability
     */
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

    // 7. VERIFY OWNERSHIP (pastikan cart ini milik user yang login)
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Item ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // 8. CHECK PRODUCT ACTIVE
    if (!cartItem.product.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak tersedia lagi",
        },
        { status: 400 },
      );
    }

    // 9. CHECK STOCK AVAILABILITY
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${cartItem.product.stock}`,
        },
        { status: 400 },
      );
    }

    // 10. UPDATE QUANTITY
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

/**
 * DELETE /api/customer/cart/items/[id]
 * Remove item from cart
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. CHECK AUTH
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

    // 2. CHECK ROLE
    const userRole = (session.user as any)?.role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat menghapus item",
        },
        { status: 403 },
      );
    }

    // 3. GET PARAMS
    const { id } = await params;
    const userId = (session.user as any)?.id;

    // 4. GET CART ITEM (untuk verify ownership)
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

    // 5. VERIFY OWNERSHIP
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Item ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // 6. DELETE ITEM
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

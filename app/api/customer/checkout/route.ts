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
    const { addressId, shippingCost = 0, notes } = body;
    const userId = (session.user as any)?.id;

    if (typeof shippingCost !== "number" || shippingCost < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Ongkir harus berupa angka positif",
        },
        { status: 400 },
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Keranjang kosong",
        },
        { status: 400 },
      );
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: `Produk tidak aktif: ${item.product.name}`,
          },
          { status: 400 },
        );
      }

      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Stok tidak cukup: ${item.product.name}. Tersedia: ${item.product.stock}`,
          },
          { status: 400 },
        );
      }
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: {
        orderNumber: "desc",
      },
    });

    let sequance = 1;
    if (lastOrder) {
      const lastSequance = parseInt(lastOrder.orderNumber.slice(-3));
      sequance = lastSequance + 1;
    }

    const orderNumber = `ORD-${dateStr}-${sequance.toString().padStart(3, "0")}`;

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    const discount = 0;
    const totalAmount = subtotal + shippingCost - discount;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        addressId: addressId || null,
        subtotal,
        shippingCost,
        discount,
        totalAmount,
        status: "PENDING",
        notes: notes || null,

        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            subtotal: item.product.price * item.quantity,
          })),
        },
        payment: {
          create: {
            amount: totalAmount,
            method: "pending",
            status: "PENDING",
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        payment: true,
        address: true,
      },
    });

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order berhasil dibuat",
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            discount: order.discount,
            status: order.status,
            notes: order.notes,
            createdAt: order.createdAt,
            items: order.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              product: {
                id: item.product.id,
                name: item.product.name,
                image: item.product.image,
              },
            })),
            address: order.address,
          },
          payment: {
            id: order.payment!.id,
            amount: order.payment!.amount,
            status: order.payment!.status,
            method: order.payment!.method,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat order",
      },
      { status: 500 },
    );
  }
}

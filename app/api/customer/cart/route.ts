import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil isi keranjang belanja pelanggan beserta ringkasannya
export async function GET(request: Request) {
  try {
    // Validasi sesi pengguna dan ambil ID pelanggan
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    // Ambil data keranjang beserta relasi item dan rincian produk
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

    // Tangani kondisi ketika keranjang belum memiliki item
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

    // Hitung subtotal harga untuk setiap item produk
    const itemsWithSubtotal = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
      subtotal: item.product.price * item.quantity,
      createdAt: item.createdAt,
    }));

    // Hitung akumulasi ringkasan jumlah item dan total harga
    const summary = {
      totalItems: cart.items.length,
      totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: itemsWithSubtotal.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      ),
    };

    // Kirim respons berhasil berisi data keranjang dan ringkasan
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
    // Tangani galat otentikasi dan kesalahan server internal
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data keranjang" },
      { status: 500 },
    );
  }
}

import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil detail pesanan florist berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID pesanan dari URL
    const { id: orderId } = await params;

    // Cari data pesanan beserta relasi user, items, payment, shipment, dan address
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                floristId: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            method: true,
            paidAt: true,
          },
        },
        shipment: {
          select: {
            id: true,
            status: true,
            courier: true,
            service: true,
            trackingNumber: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
        address: true,
      },
    });

    // Validasi keberadaan data pesanan
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi bahwa pesanan memuat setidaknya satu produk milik florist ini
    const hasFloristProduct = order.items.some(
      (item: any) => item.product.floristId === userId
    );

    if (!hasFloristProduct) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke pesanan ini" },
        { status: 403 }
      );
    }

    // Format data respon dengan alias alamat pengiriman
    const responseData = {
      ...order,
      shippingAddress: order.address,
    };

    // Kembalikan respon sukses data detail pesanan florist
    return NextResponse.json({
      success: true,
      message: "Detail pesanan berhasil diambil",
      data: responseData,
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Error fetching order detail:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail pesanan" },
      { status: 500 }
    );
  }
}

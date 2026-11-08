import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const { id: orderId } = await params;

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

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify that this order contains at least one product from this florist
    const hasFloristProduct = order.items.some(
      (item: any) => item.product.floristId === userId
    );

    if (!hasFloristProduct) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke pesanan ini" },
        { status: 403 }
      );
    }

    // Return with shippingAddress as alias for address
    const responseData = {
      ...order,
      shippingAddress: order.address,
    };

    return NextResponse.json({
      success: true,
      message: "Detail pesanan berhasil diambil",
      data: responseData,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error fetching order detail:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail pesanan" },
      { status: 500 }
    );
  }
}

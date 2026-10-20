import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
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
    const userId = (session.user as any)?.id;
    const { orderId } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan untuk order ini",
        },
        { status: 404 },
      );
    }

    if (shipment.order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan order Anda",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Informasi pengiriman berhasil diambil",
      data: { shipment },
    });
  } catch (error) {
    console.error("Error mengambil informasi pengiriman:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil informasi pengiriman" },
      { status: 500 },
    );
  }
}

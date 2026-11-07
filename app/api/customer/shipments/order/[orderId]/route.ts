import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Fetch shipment info untuk order by orderId
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Validate user session dan parse orderId
    const { userId } = await requireAuth(request);
    const { orderId } = await params;

    // Query shipment dengan order details
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

    // Validate shipment existence
    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan untuk order ini",
        },
        { status: 404 },
      );
    }

    // Validate order ownership
    if (shipment.order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan order Anda",
        },
        { status: 403 },
      );
    }

    // Return response dengan shipment data
    return NextResponse.json({
      success: true,
      message: "Informasi pengiriman berhasil diambil",
      data: { shipment },
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil informasi pengiriman" },
      { status: 500 },
    );
  }
}

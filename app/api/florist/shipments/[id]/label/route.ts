import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { isValidShippingLabelUrl } from "@/lib/config/domain";
import { reportServerError } from "@/lib/server-error-report";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil atau membuka file PDF shipping label resmi Biteship
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            items: {
              select: {
                product: {
                  select: {
                    floristId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: "Shipment tidak ditemukan" },
        { status: 404 },
      );
    }

    const isOwner = shipment.order.items.some(
      (item) => item.product.floristId === userId,
    );
    if (userRole !== "ADMIN" && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke label pengiriman ini",
        },
        { status: 403 },
      );
    }

    if (isValidShippingLabelUrl(shipment.biteshipLabelUrl)) {
      return NextResponse.redirect(shipment.biteshipLabelUrl, 307);
    }

    if (!shipment.biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Shipment tidak terhubung ke Biteship" },
        { status: 400 },
      );
    }

    const client = getBiteshipClient();
    const pdfUrl = await client.getShippingLabel(shipment.biteshipOrderId);

    if (!pdfUrl || !isValidShippingLabelUrl(pdfUrl)) {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil URL PDF label dari Biteship",
        },
        { status: 502 },
      );
    }

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { biteshipLabelUrl: pdfUrl },
    });

    return NextResponse.redirect(pdfUrl, 307);
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[FLORIST_SHIPMENT_LABEL_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuka label pengiriman",
      },
      { status: 500 },
    );
  }
}

import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk mengambil URL cetak label pengiriman AWB Biteship
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "FLORIST",
      "ADMIN",
    ]);
    const { id: shipmentId } = await params;

    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      select: {
        biteshipOrderId: true,
        biteshipLabelUrl: true,
        floristId: true,
        announcement: { select: { supplierId: true } },
      },
    });

    const directSale = !preOrder
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          select: {
            biteshipOrderId: true,
            biteshipLabelUrl: true,
            floristId: true,
            stock: { select: { supplierId: true } },
          },
        })
      : null;

    const record = preOrder || directSale;
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Pengiriman tidak ditemukan" },
        { status: 404 },
      );
    }

    const supplierId = preOrder
      ? preOrder.announcement.supplierId
      : directSale?.stock.supplierId;
    const floristId = record.floristId;

    if (userRole === "SUPPLIER" && supplierId !== userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    if (userRole === "FLORIST" && floristId !== userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (!record.biteshipOrderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengiriman belum dibuat di Biteship sehingga label belum tersedia",
        },
        { status: 400 },
      );
    }

    let labelUrl = record.biteshipLabelUrl;
    if (!labelUrl) {
      const biteshipClient = getBiteshipClient();
      labelUrl = await biteshipClient.getShippingLabel(record.biteshipOrderId);

      if (preOrder) {
        await prisma.harvestPreOrder.update({
          where: { id: shipmentId },
          data: { biteshipLabelUrl: labelUrl },
        });
      } else {
        await prisma.stockTransaction.update({
          where: { id: shipmentId },
          data: { biteshipLabelUrl: labelUrl },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        labelUrl,
      },
    });
  } catch (error) {
    reportServerError("Error getting Biteship label:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil label pengiriman",
      },
      { status: 500 },
    );
  }
}

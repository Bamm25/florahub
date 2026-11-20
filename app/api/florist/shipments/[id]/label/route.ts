import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { isValidShippingLabelUrl } from "@/lib/config/domain";
import { renderPrintableShippingLabelHtml } from "@/lib/shipping-label-html";
import { reportServerError } from "@/lib/server-error-report";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil atau membuka file PDF/HTML shipping label pengiriman florist
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
          include: {
            user: {
              select: {
                name: true,
                phone: true,
              },
            },
            address: true,
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    floristId: true,
                    florist: {
                      select: {
                        name: true,
                        phone: true,
                        floristProfile: {
                          select: {
                            shopName: true,
                          },
                        },
                        addresses: {
                          orderBy: { isDefault: "desc" },
                          take: 1,
                        },
                      },
                    },
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

    if (shipment.biteshipOrderId) {
      const client = getBiteshipClient();
      const pdfUrl = await client.getShippingLabel(shipment.biteshipOrderId);

      if (pdfUrl && isValidShippingLabelUrl(pdfUrl)) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { biteshipLabelUrl: pdfUrl },
        });
        return NextResponse.redirect(pdfUrl, 307);
      }
    }

    // Fallback: Render HTML AWB Shipping Label siap cetak (untuk Pengiriman Manual & Biteship Sandbox/Free Tier)
    const firstFlorist = shipment.order.items[0]?.product?.florist;
    const floristAddr = firstFlorist?.addresses?.[0];
    const destAddr = shipment.order.address;

    const html = renderPrintableShippingLabelHtml({
      orderNumber: shipment.order.orderNumber,
      orderTypeLabel: shipment.biteshipOrderId
        ? "Pengiriman Buket B2C (Biteship)"
        : "Pengiriman Buket B2C (Resi Manual)",
      courier: shipment.courier || "KURIR",
      service: shipment.service || "REG",
      trackingNumber:
        shipment.trackingNumber ||
        `MNL-${shipment.order.orderNumber.slice(-8)}`,
      createdAt: shipment.shippedAt || shipment.createdAt,
      weightGrams: shipment.weight,
      shippingCost: shipment.shippingCost,
      sender: {
        name:
          firstFlorist?.floristProfile?.shopName ||
          floristAddr?.recipientName ||
          firstFlorist?.name ||
          "Studio Florist FloraHub",
        phone: floristAddr?.phone || firstFlorist?.phone,
        address: floristAddr
          ? `${floristAddr.fullAddress}, ${floristAddr.city}, ${floristAddr.province} ${floristAddr.postalCode}`
          : "Studio Florist Terdaftar",
      },
      recipient: {
        name:
          destAddr?.recipientName ||
          shipment.order.user?.name ||
          "Customer FloraHub",
        phone: destAddr?.phone || shipment.order.user?.phone,
        address: destAddr
          ? `${destAddr.fullAddress}, ${destAddr.city}, ${destAddr.province} ${destAddr.postalCode}`
          : "Alamat Tujuan Customer",
      },
      items: shipment.order.items.map((item) => ({
        name: item.product.name,
        quantity: `${item.quantity} unit`,
      })),
      notes: shipment.order.notes,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
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

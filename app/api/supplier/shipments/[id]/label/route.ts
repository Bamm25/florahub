import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { isValidShippingLabelUrl } from "@/lib/config/domain";
import { renderPrintableShippingLabelHtml } from "@/lib/shipping-label-html";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP GET untuk mengambil atau mencetak label pengiriman AWB (Pre-Order & Pembelian Stok B2B)
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
      include: {
        florist: {
          select: {
            name: true,
            phone: true,
            floristProfile: { select: { shopName: true } },
            addresses: {
              orderBy: { isDefault: "desc" },
              take: 1,
            },
          },
        },
        announcement: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                addresses: {
                  orderBy: { isDefault: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const directSale = !preOrder
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          include: {
            florist: {
              select: {
                name: true,
                phone: true,
                floristProfile: { select: { shopName: true } },
                addresses: {
                  orderBy: { isDefault: "desc" },
                  take: 1,
                },
              },
            },
            stock: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    addresses: {
                      orderBy: { isDefault: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
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
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    if (userRole === "FLORIST" && floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    let labelUrl = isValidShippingLabelUrl(record.biteshipLabelUrl)
      ? record.biteshipLabelUrl
      : null;

    if (!labelUrl && record.biteshipOrderId) {
      const biteshipClient = getBiteshipClient();
      const fetchedUrl = await biteshipClient.getShippingLabel(
        record.biteshipOrderId,
      );
      if (isValidShippingLabelUrl(fetchedUrl)) {
        labelUrl = fetchedUrl;
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
    }

    const acceptHeader = request.headers.get("accept") || "";
    const wantsJsonOnly =
      acceptHeader.includes("application/json") &&
      !acceptHeader.includes("text/html");

    if (wantsJsonOnly) {
      return NextResponse.json({
        success: true,
        data: {
          labelUrl: labelUrl || `/api/supplier/shipments/${shipmentId}/label`,
        },
      });
    }

    if (labelUrl) {
      return NextResponse.redirect(labelUrl, 307);
    }

    // Fallback: Render HTML AWB Shipping Label siap cetak (untuk Biteship Sandbox / Free Tier / Manual)
    const supplier = preOrder
      ? preOrder.announcement.supplier
      : directSale!.stock.supplier;
    const supplierAddr = supplier.addresses?.[0];
    const florist = record.florist;
    const floristAddr = florist?.addresses?.[0];

    const itemName = preOrder
      ? `${preOrder.announcement.flowerName}${preOrder.announcement.variety ? ` (${preOrder.announcement.variety})` : ""}`
      : `${directSale!.stock.name}${directSale!.stock.variety ? ` (${directSale!.stock.variety})` : ""}`;
    const itemUnit = preOrder ? "tangkai" : directSale!.stock.unit || "tangkai";

    const html = renderPrintableShippingLabelHtml({
      orderNumber: `${preOrder ? "PO" : "SO"}-${record.id.slice(-8).toUpperCase()}`,
      orderTypeLabel: preOrder
        ? "Pre-Order Panen Kebun B2B"
        : "Pasokan Bunga Kebun B2B",
      courier: record.courier || "KURIR MITRA",
      service: record.service || "REG",
      trackingNumber:
        record.trackingNumber ||
        `AWB-${record.id.slice(-8).toUpperCase()}`,
      createdAt: record.shippedAt || record.createdAt,
      weightGrams: record.weight,
      shippingCost: record.shippingCost,
      sender: {
        name: supplier.name,
        phone: supplierAddr?.phone || supplier.phone,
        address: supplierAddr
          ? `${supplierAddr.fullAddress}, ${supplierAddr.city}, ${supplierAddr.province} ${supplierAddr.postalCode}`
          : "Kebun Mitra Supplier FloraHub",
      },
      recipient: {
        name:
          florist?.floristProfile?.shopName ||
          floristAddr?.recipientName ||
          florist?.name ||
          "Studio Florist",
        phone: floristAddr?.phone || florist?.phone,
        address: floristAddr
          ? `${floristAddr.fullAddress}, ${floristAddr.city}, ${floristAddr.province} ${floristAddr.postalCode}`
          : "Alamat Studio Florist",
      },
      items: [
        {
          name: itemName,
          quantity: `${record.quantity} ${itemUnit}`,
        },
      ],
      notes: preOrder ? preOrder.notes : null,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
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
        message: "Gagal mengambil label pengiriman",
      },
      { status: 500 },
    );
  }
}

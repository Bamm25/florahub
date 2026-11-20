import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import { buildSupplierTrackingTimeline } from "@/lib/order-tracking-timeline";
import {
  fulfillPreOrderToInventory,
  fulfillSaleToInventory,
} from "@/lib/supply-chain/fulfill-inventory";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const supplierTrackSelect = {
  id: true,
  name: true,
  addresses: {
    orderBy: { isDefault: "desc" as const },
    take: 1,
    select: {
      city: true,
      province: true,
    },
  },
};

const floristTrackSelect = {
  id: true,
  name: true,
  floristProfile: {
    select: {
      shopName: true,
    },
  },
  addresses: {
    orderBy: { isDefault: "desc" as const },
    take: 1,
    select: {
      fullAddress: true,
      city: true,
      province: true,
    },
  },
};

function formatLocationLabel(
  addr?: { fullAddress?: string | null; city?: string | null; province?: string | null } | null,
  includeFullAddress = false,
): string | null {
  if (!addr) return null;
  const parts: string[] = [];
  if (includeFullAddress && addr.fullAddress?.trim()) {
    parts.push(addr.fullAddress.trim());
  }
  const region = [addr.city?.trim(), addr.province?.trim()]
    .filter(Boolean)
    .join(", ");
  if (region) parts.push(region);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// Handler HTTP GET untuk melacak posisi dan riwayat pengiriman kurir Biteship
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "FLORIST",
      "ADMIN",
    ]);
    const { id: shipmentId } = await params;

    // Cari di HarvestPreOrder dulu
    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: shipmentId },
      include: {
        announcement: {
          include: {
            supplier: { select: supplierTrackSelect },
          },
        },
        florist: { select: floristTrackSelect },
      },
    });

    const directSale = !preOrder
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          include: {
            stock: {
              include: {
                supplier: { select: supplierTrackSelect },
              },
            },
            florist: { select: floristTrackSelect },
          },
        })
      : null;

    const orderData = preOrder || directSale;
    if (!orderData) {
      return NextResponse.json(
        { success: false, message: "Data pengiriman tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi kepemilikan
    const supplierId = preOrder
      ? preOrder.announcement.supplierId
      : directSale?.stock.supplierId;
    const floristId = orderData.floristId;

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

    if (!orderData.biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Pengiriman belum dibuat di Biteship" },
        { status: 409 },
      );
    }

    // Hubungi Biteship Client secara aman (fallback ke milestone DB bila API kurir sementara bermasalah)
    let biteshipOrder: Awaited<ReturnType<ReturnType<typeof getBiteshipClient>["getOrder"]>> | null =
      null;
    try {
      const biteshipClient = getBiteshipClient();
      biteshipOrder = await biteshipClient.getOrder(orderData.biteshipOrderId);
    } catch (biteshipError) {
      reportServerError("[SUPPLIER_TRACK_BITESHIP_FALLBACK]", biteshipError);
    }

    let waybillId = orderData.trackingNumber;
    if (biteshipOrder) {
      const newStatus = mapBiteshipStatus(biteshipOrder.status);
      waybillId = biteshipOrder.courier?.waybill_id || orderData.trackingNumber;

      // A booking/allocated courier is not a pickup. Do not regress delivered orders.
      if (newStatus === "SHIPPED") {
        if (preOrder) {
          await prisma.harvestPreOrder.updateMany({
            where: { id: shipmentId, status: "PAID" },
            data: {
              status: "SHIPPED",
              shippedAt: preOrder.shippedAt || new Date(),
              trackingNumber: waybillId,
            },
          });
        } else {
          await prisma.stockTransaction.updateMany({
            where: { id: shipmentId, status: "PAID" },
            data: {
              status: "SHIPPED",
              shippedAt: directSale?.shippedAt || new Date(),
              trackingNumber: waybillId,
            },
          });
        }
      }
      if (newStatus === "DELIVERED") {
        if (preOrder) await fulfillPreOrderToInventory(shipmentId);
        else await fulfillSaleToInventory(shipmentId);
      }
      if (waybillId) {
        if (preOrder) {
          await prisma.harvestPreOrder.updateMany({
            where: { id: shipmentId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
            data: { trackingNumber: waybillId },
          });
        } else {
          await prisma.stockTransaction.updateMany({
            where: { id: shipmentId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
            data: { trackingNumber: waybillId },
          });
        }
      }
    }

    // Ambil data terbaru setelah sinkronisasi
    const refreshedPreOrder = preOrder
      ? await prisma.harvestPreOrder.findUnique({
          where: { id: shipmentId },
          include: {
            announcement: {
              include: {
                supplier: { select: supplierTrackSelect },
              },
            },
            florist: { select: floristTrackSelect },
          },
        })
      : null;

    const refreshedSale = directSale
      ? await prisma.stockTransaction.findUnique({
          where: { id: shipmentId },
          include: {
            stock: {
              include: {
                supplier: { select: supplierTrackSelect },
              },
            },
            florist: { select: floristTrackSelect },
          },
        })
      : null;

    const currentPreOrder = refreshedPreOrder ?? preOrder;
    const currentSale = refreshedSale ?? directSale;
    const currentOrder = currentPreOrder || currentSale || orderData;

    const orderNumber = `${currentPreOrder ? "PO" : "SO"}-${currentOrder.id.slice(-8).toUpperCase()}`;
    const courierCode =
      biteshipOrder?.courier?.company?.toUpperCase() ||
      currentOrder.courier ||
      "Kurir Ekspedisi";
    const flowerName = currentPreOrder
      ? currentPreOrder.announcement.flowerName
      : currentSale?.stock.name || "Bunga Segar";
    const unit = currentPreOrder
      ? "tangkai"
      : currentSale?.stock.unit || "tangkai";
    const supplier = currentPreOrder
      ? currentPreOrder.announcement.supplier
      : currentSale?.stock.supplier;
    const supplierName = supplier?.name || "Mitra Kebun";
    const supplierLocation =
      formatLocationLabel(supplier?.addresses?.[0], false) ||
      (currentPreOrder ? currentPreOrder.announcement.location : currentSale?.stock.location) ||
      null;
    const floristShopName =
      currentOrder.florist?.floristProfile?.shopName ||
      currentOrder.florist?.name ||
      "Studio Florist";
    const floristLocation = formatLocationLabel(
      currentOrder.florist?.addresses?.[0],
      true,
    );

    const rawHistory = Array.isArray(biteshipOrder?.courier?.history)
      ? biteshipOrder.courier.history
      : [];

    const timeline = buildSupplierTrackingTimeline({
      orderType: currentPreOrder ? "PREORDER" : "DIRECT_SALE",
      orderNumber,
      status: currentOrder.status,
      flowerName,
      quantity: currentOrder.quantity,
      unit,
      supplierName,
      floristName: floristShopName,
      courier: courierCode,
      trackingNumber: waybillId || currentOrder.trackingNumber,
      createdAt: currentOrder.createdAt.toISOString(),
      updatedAt: currentOrder.updatedAt.toISOString(),
      confirmedAt: currentPreOrder?.confirmedAt?.toISOString() ?? null,
      depositPaidAt: currentPreOrder?.depositPaidAt?.toISOString() ?? null,
      finalPaidAt: currentPreOrder?.finalPaidAt?.toISOString() ?? null,
      shippedAt: currentOrder.shippedAt?.toISOString() ?? null,
      deliveredAt: currentOrder.deliveredAt?.toISOString() ?? null,
      cancelledAt: currentPreOrder?.cancelledAt?.toISOString() ?? null,
      cancelReason: currentPreOrder?.cancelReason ?? null,
      remoteHistory: rawHistory.map((h) => ({
        status: h.status,
        note: h.note,
        updated_at: h.updated_at,
      })),
    });

    const historyItems = timeline.map((ev) => ({
      status: ev.statusTitle,
      statusTitle: ev.statusTitle,
      note: ev.description,
      updated_at: ev.isoDate,
      dateStr: ev.dateStr,
      timeStr: ev.timeStr,
      isCancelled: ev.isCancelled,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tracking: {
          status: biteshipOrder?.status || currentOrder.status.toLowerCase(),
          orderStatus: currentOrder.status,
          courier: biteshipOrder?.courier || {
            company: courierCode,
            waybill_id: waybillId,
          },
          timeline,
          history: historyItems,
          link: biteshipOrder?.courier?.link || null,
          route: {
            senderName: supplierName,
            senderLocation: supplierLocation,
            recipientName: floristShopName,
            recipientLocation: floristLocation,
          },
          timestamps: {
            createdAt: currentOrder.createdAt.toISOString(),
            shippedAt: currentOrder.shippedAt?.toISOString() ?? null,
            deliveredAt: currentOrder.deliveredAt?.toISOString() ?? null,
          },
        },
      },
    });
  } catch (error) {
    reportServerError("Error tracking Biteship shipment:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal melacak pengiriman",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { maskEmail } from "@/lib/utils/masking";
import { adminSupplyQuerySchema } from "@/lib/validations/schemas";
import type {
  HarvestPreOrderStatus,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

// Evaluasi anomali pembayaran dan logistik untuk transaksi pembelian stok langsung B2B
function evaluateDirectAnomaly(tx: {
  status: TransactionStatus;
  paymentProof: string | null;
  trackingNumber: string | null;
  biteshipOrderId: string | null;
}): { hasAnomaly: boolean; anomalyNote: string | null } {
  if (
    ["SHIPPED", "DELIVERED"].includes(tx.status) &&
    !tx.trackingNumber &&
    !tx.biteshipOrderId
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Transaksi dikirim tanpa nomor resi atau ID Biteship",
    };
  }

  if (
    ["PAID", "SHIPPED", "DELIVERED"].includes(tx.status) &&
    !tx.paymentProof
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Status lunas/dikirim tanpa bukti pembayaran tercatat",
    };
  }

  return { hasAnomaly: false, anomalyNote: null };
}

// Evaluasi anomali tahapan DP, pelunasan akhir, dan pengiriman pada pre-order panen kebun
function evaluatePreOrderAnomaly(po: {
  status: HarvestPreOrderStatus;
  depositPaidAt: Date | null;
  depositProof: string | null;
  finalPaidAt: Date | null;
  finalProof: string | null;
  trackingNumber: string | null;
  biteshipOrderId: string | null;
}): { hasAnomaly: boolean; anomalyNote: string | null } {
  if (
    ["DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"].includes(po.status) &&
    !po.depositPaidAt &&
    !po.depositProof
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Status melewati tahap DP tanpa catatan pembayaran DP",
    };
  }

  if (
    ["PAID", "SHIPPED", "DELIVERED"].includes(po.status) &&
    !po.finalPaidAt &&
    !po.finalProof
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Status lunas/dikirim tanpa catatan pelunasan akhir",
    };
  }

  if (
    ["SHIPPED", "DELIVERED"].includes(po.status) &&
    !po.trackingNumber &&
    !po.biteshipOrderId
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Pre-order dikirim tanpa nomor resi atau ID Biteship",
    };
  }

  return { hasAnomaly: false, anomalyNote: null };
}

// Handler HTTP GET read-only untuk memantau pergerakan rantai pasok B2B (Supplier -> Florist) 
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type")?.trim();
    const rawStatus = searchParams.get("status")?.trim();
    const rawSearch = searchParams.get("search")?.trim();

    const parsed = adminSupplyQuerySchema.safeParse({
      type: rawType || undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: rawStatus || undefined,
      search: rawSearch || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Filter pasokan B2B tidak valid",
        },
        { status: 400 },
      );
    }

    const { type, page, limit, status, search } = parsed.data;
    const skip = (page - 1) * limit;

    if (type === "DIRECT") {
      const typedStatus = status as TransactionStatus | undefined;
      const whereClause: Prisma.StockTransactionWhereInput = {
        ...(typedStatus ? { status: typedStatus } : {}),
        ...(search
          ? {
              OR: [
                { stock: { name: { contains: search, mode: "insensitive" } } },
                { stock: { variety: { contains: search, mode: "insensitive" } } },
                {
                  stock: {
                    supplier: { name: { contains: search, mode: "insensitive" } },
                  },
                },
                { florist: { name: { contains: search, mode: "insensitive" } } },
                {
                  florist: {
                    floristProfile: {
                      shopName: { contains: search, mode: "insensitive" },
                    },
                  },
                },
                { trackingNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.stockTransaction.findMany({
          where: whereClause,
          select: {
            id: true,
            status: true,
            quantity: true,
            pricePerUnit: true,
            totalPrice: true,
            shippingCost: true,
            paymentProof: true,
            courier: true,
            service: true,
            trackingNumber: true,
            biteshipOrderId: true,
            shippedAt: true,
            deliveredAt: true,
            createdAt: true,
            stock: {
              select: {
                name: true,
                variety: true,
                unit: true,
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            florist: {
              select: {
                id: true,
                name: true,
                email: true,
                floristProfile: {
                  select: {
                    shopName: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prisma.stockTransaction.count({ where: whereClause }),
      ]);

      const items = rows.map((row) => ({
        id: row.id,
        type: "DIRECT" as const,
        status: row.status,
        flowerName: row.stock.name,
        variety: row.stock.variety,
        unit: row.stock.unit,
        quantity: row.quantity,
        pricePerUnit: row.pricePerUnit,
        totalPrice: row.totalPrice,
        shippingCost: row.shippingCost,
        harvestDate: null,
        createdAt: row.createdAt,
        supplier: {
          id: row.stock.supplier.id,
          name: row.stock.supplier.name,
          maskedEmail: maskEmail(row.stock.supplier.email),
        },
        florist: {
          id: row.florist.id,
          name: row.florist.floristProfile?.shopName || row.florist.name,
          maskedEmail: maskEmail(row.florist.email),
        },
        paymentSummary: {
          stage: ["PAID", "SHIPPED", "DELIVERED"].includes(row.status)
            ? ("FULL_PAID" as const)
            : row.status === "CANCELLED"
              ? ("CANCELLED" as const)
              : ("UNPAID" as const),
          hasPaymentProof: Boolean(row.paymentProof),
          depositAmount: null,
          depositPaidAt: null,
          remainingAmount: null,
          finalPaidAt: null,
        },
        shipment: {
          courier: row.courier,
          service: row.service,
          trackingNumber: row.trackingNumber,
          hasBiteshipOrder: Boolean(row.biteshipOrderId),
          shippedAt: row.shippedAt,
          deliveredAt: row.deliveredAt,
        },
        reconciliation: evaluateDirectAnomaly({
          status: row.status,
          paymentProof: row.paymentProof,
          trackingNumber: row.trackingNumber,
          biteshipOrderId: row.biteshipOrderId,
        }),
      }));

      return NextResponse.json({
        success: true,
        message: "Data rantai pasok B2B berhasil diambil",
        data: {
          type: "DIRECT",
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      });
    }

    const typedPreorderStatus = status as HarvestPreOrderStatus | undefined;
    const preOrderWhere: Prisma.HarvestPreOrderWhereInput = {
      ...(typedPreorderStatus ? { status: typedPreorderStatus } : {}),
      ...(search
        ? {
            OR: [
              {
                announcement: {
                  flowerName: { contains: search, mode: "insensitive" },
                },
              },
              {
                announcement: {
                  variety: { contains: search, mode: "insensitive" },
                },
              },
              {
                announcement: {
                  supplier: { name: { contains: search, mode: "insensitive" } },
                },
              },
              { florist: { name: { contains: search, mode: "insensitive" } } },
              {
                florist: {
                  floristProfile: {
                    shopName: { contains: search, mode: "insensitive" },
                  },
                },
              },
              { trackingNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [preOrderRows, preOrderTotal] = await Promise.all([
      prisma.harvestPreOrder.findMany({
        where: preOrderWhere,
        select: {
          id: true,
          status: true,
          quantity: true,
          pricePerUnit: true,
          totalPrice: true,
          shippingCost: true,
          depositAmount: true,
          depositPaidAt: true,
          depositProof: true,
          remainingAmount: true,
          finalPaidAt: true,
          finalProof: true,
          courier: true,
          service: true,
          trackingNumber: true,
          biteshipOrderId: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
          announcement: {
            select: {
              flowerName: true,
              variety: true,
              harvestDate: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          florist: {
            select: {
              id: true,
              name: true,
              email: true,
              floristProfile: {
                select: {
                  shopName: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.harvestPreOrder.count({ where: preOrderWhere }),
    ]);

    const items = preOrderRows.map((row) => ({
      id: row.id,
      type: "PREORDER" as const,
      status: row.status,
      flowerName: row.announcement.flowerName,
      variety: row.announcement.variety,
      unit: "tangkai",
      quantity: row.quantity,
      pricePerUnit: row.pricePerUnit,
      totalPrice: row.totalPrice,
      shippingCost: row.shippingCost,
      harvestDate: row.announcement.harvestDate,
      createdAt: row.createdAt,
      supplier: {
        id: row.announcement.supplier.id,
        name: row.announcement.supplier.name,
        maskedEmail: maskEmail(row.announcement.supplier.email),
      },
      florist: {
        id: row.florist.id,
        name: row.florist.floristProfile?.shopName || row.florist.name,
        maskedEmail: maskEmail(row.florist.email),
      },
      paymentSummary: {
        stage: ["PAID", "SHIPPED", "DELIVERED"].includes(row.status)
          ? ("FULL_PAID" as const)
          : row.status === "DEPOSIT_PAID"
            ? ("DEPOSIT_PAID" as const)
            : row.status === "CANCELLED" || row.status === "EXPIRED"
              ? ("CANCELLED" as const)
              : ("UNPAID" as const),
        hasPaymentProof: Boolean(row.finalProof || row.depositProof),
        depositAmount: row.depositAmount,
        depositPaidAt: row.depositPaidAt,
        remainingAmount: row.remainingAmount,
        finalPaidAt: row.finalPaidAt,
      },
      shipment: {
        courier: row.courier,
        service: row.service,
        trackingNumber: row.trackingNumber,
        hasBiteshipOrder: Boolean(row.biteshipOrderId),
        shippedAt: row.shippedAt,
        deliveredAt: row.deliveredAt,
      },
      reconciliation: evaluatePreOrderAnomaly({
        status: row.status,
        depositPaidAt: row.depositPaidAt,
        depositProof: row.depositProof,
        finalPaidAt: row.finalPaidAt,
        finalProof: row.finalProof,
        trackingNumber: row.trackingNumber,
        biteshipOrderId: row.biteshipOrderId,
      }),
    }));

    return NextResponse.json({
      success: true,
      message: "Data rantai pasok B2B berhasil diambil",
      data: {
        type: "PREORDER",
        items,
        pagination: {
          page,
          limit,
          total: preOrderTotal,
          totalPages: Math.ceil(preOrderTotal / limit),
          hasNext: page * limit < preOrderTotal,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Admin B2B supply fetch failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data rantai pasok B2B",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { maskEmail, maskPhone } from "@/lib/utils/masking";
import { adminOrderQuerySchema } from "@/lib/validations/schemas";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Evaluasi konsistensi antara status pesanan, status pembayaran Midtrans, dan resi Biteship
function evaluateB2CAnomaly(order: {
  status: OrderStatus;
  payment: { status: PaymentStatus } | null;
  shipment: { trackingNumber: string | null; biteshipOrderId: string | null } | null;
}): { hasAnomaly: boolean; anomalyNote: string | null } {
  const advancedPaidStatuses: OrderStatus[] = [
    "PAID",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
  ];
  const shippingStatuses: OrderStatus[] = ["SHIPPED", "DELIVERED"];

  if (order.payment?.status === "PAID" && order.status === "PENDING") {
    return {
      hasAnomaly: true,
      anomalyNote: "Pembayaran sudah PAID tetapi status pesanan masih PENDING",
    };
  }

  if (
    advancedPaidStatuses.includes(order.status) &&
    order.payment?.status !== "PAID"
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Status pesanan maju tanpa status pembayaran PAID",
    };
  }

  if (
    shippingStatuses.includes(order.status) &&
    !order.shipment?.trackingNumber &&
    !order.shipment?.biteshipOrderId
  ) {
    return {
      hasAnomaly: true,
      anomalyNote: "Pesanan berstatus dikirim tanpa nomor resi atau ID kurir",
    };
  }

  return { hasAnomaly: false, anomalyNote: null };
}

// Handler HTTP GET read-only untuk monitoring pesanan B2C lintas role oleh admin
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status")?.trim();
    const rawIsPreorder = searchParams.get("isPreorder")?.trim();
    const rawSearch = searchParams.get("search")?.trim();

    const parsed = adminOrderQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: rawStatus || undefined,
      isPreorder: rawIsPreorder || undefined,
      search: rawSearch || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Filter pesanan tidak valid",
        },
        { status: 400 },
      );
    }

    const { page, limit, status, isPreorder, search } = parsed.data;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(isPreorder !== undefined ? { isPreorder } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              {
                items: {
                  some: {
                    product: { name: { contains: search, mode: "insensitive" } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          isPreorder: true,
          subtotal: true,
          shippingCost: true,
          discount: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          address: {
            select: {
              city: true,
              province: true,
            },
          },
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
              subtotal: true,
              product: {
                select: {
                  name: true,
                  florist: {
                    select: {
                      id: true,
                      name: true,
                      floristProfile: {
                        select: {
                          shopName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payment: {
            select: {
              method: true,
              status: true,
              amount: true,
              paidAt: true,
            },
          },
          shipment: {
            select: {
              courier: true,
              service: true,
              status: true,
              trackingNumber: true,
              biteshipOrderId: true,
              shippedAt: true,
              deliveredAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const orders = rows.map((row) => {
      const reconciliation = evaluateB2CAnomaly({
        status: row.status,
        payment: row.payment ? { status: row.payment.status } : null,
        shipment: row.shipment
          ? {
              trackingNumber: row.shipment.trackingNumber,
              biteshipOrderId: row.shipment.biteshipOrderId,
            }
          : null,
      });

      return {
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        isPreorder: row.isPreorder,
        subtotal: row.subtotal,
        shippingCost: row.shippingCost,
        discount: row.discount,
        totalAmount: row.totalAmount,
        createdAt: row.createdAt,
        customer: {
          id: row.user.id,
          name: row.user.name,
          maskedEmail: maskEmail(row.user.email),
          maskedPhone: maskPhone(row.user.phone),
        },
        destination: row.address
          ? {
              city: row.address.city,
              province: row.address.province,
            }
          : null,
        items: row.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          floristName:
            item.product.florist.floristProfile?.shopName ||
            item.product.florist.name,
        })),
        payment: row.payment
          ? {
              method: row.payment.method,
              status: row.payment.status,
              amount: row.payment.amount,
              paidAt: row.payment.paidAt,
            }
          : null,
        shipment: row.shipment
          ? {
              courier: row.shipment.courier,
              service: row.shipment.service,
              status: row.shipment.status,
              trackingNumber: row.shipment.trackingNumber,
              hasBiteshipOrder: Boolean(row.shipment.biteshipOrderId),
              shippedAt: row.shipment.shippedAt,
              deliveredAt: row.shipment.deliveredAt,
            }
          : null,
        reconciliation,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pesanan berhasil diambil",
      data: {
        orders,
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
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Admin B2C orders fetch failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data pesanan",
      },
      { status: 500 },
    );
  }
}

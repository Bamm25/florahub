import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const body = await request.json();
    const { orderId, courier, service, trackingNumber, estimatedDays, weight } =
      body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID wajib diisi",
        },
        { status: 400 },
      );
    }

    if (!courier || typeof courier !== "string" || courier.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kurir wajib diisi",
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { floristId: true },
            },
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (order.shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ini sudah memiliki shipment",
        },
        { status: 400 },
      );
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat membuat shipment: status order saat ini "${order.status}". Hanya order dengan status PAID yang dapat dikirim`,
        },
        { status: 400 },
      );
    }

    const isOwner = order.items.some(
      (item) => item.product.floristId === floristId,
    );
    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    const [shipment] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          orderId: order.id,
          courier: courier.trim(),
          service: service?.trim() || null,
          trackingNumber: trackingNumber?.trim() || null,
          status: "PENDING",
          estimatedDays: estimatedDays || null,
          shippingCost: order.shippingCost,
          weight: weight || null,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: "PROCESSING" },
      }),
    ]);

    await createAuditLog({
      userId: floristId,
      action: "CREATE",
      entity: "Shipment",
      entityId: shipment.id,
      newValue: {
        orderId: shipment.orderId,
        courier: shipment.courier,
        service: shipment.service,
        trackingNumber: shipment.trackingNumber,
        shippingCost: shipment.shippingCost,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Shipment berhasil dibuat",
        data: { shipment },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal membuat shipment" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const trackingNumber = searchParams.get("trackingNumber");

    const whereClause: any = {
      order: {
        items: {
          some: {
            product: {
              floristId: floristId,
            },
          },
        },
      },
    };

    if (status) whereClause.status = status;
    if (orderId) whereClause.orderId = orderId;
    if (trackingNumber)
      whereClause.trackingNumber = {
        contains: trackingNumber,
        mode: "insensitive",
      };

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Daftar shipment berhasil diambil",
      data: {
        total,
        page,
        limit,
        totalPages,
        shipments,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar shipment" },
      { status: 500 },
    );
  }
}

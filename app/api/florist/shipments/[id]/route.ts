import { createAuditLog } from "@/lib/auditLog";
import { authOptions } from "@/lib/auth";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { updateShipmentStatusSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const validated = updateShipmentStatusSchema.parse(body);
    const { status, courier, service, trackingNumber, estimatedDays, weight } = validated;
    
    // Convert weight from kg to grams for database storage
    const weightInGrams = weight !== undefined && weight !== null ? Math.round(weight * 1000) : undefined;

    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { floristId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existingShipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const isOwner = existingShipment.order.items.some(
      (item) => item.product.floristId === floristId,
    );

    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Shipment ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    if (
      existingShipment.status === "DELIVERED" ||
      existingShipment.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment sudah selesai, tidak dapat diubah lagi",
        },
        { status: 400 },
      );
    }

    if (status && status !== existingShipment.status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ["PROCESSING", "SHIPPED", "CANCELLED"],
        PROCESSING: ["SHIPPED", "CANCELLED"],
        SHIPPED: ["DELIVERED", "CANCELLED"],
      };

      const allowedStatuses = validTransitions[existingShipment.status] || [];

      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Transisi status tidak valid: ${existingShipment.status} → ${status}. Status yang diizinkan: ${allowedStatuses.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    if (status === "SHIPPED") {
      const finalTrackingNumber =
        trackingNumber || existingShipment.trackingNumber;

      if (!finalTrackingNumber || finalTrackingNumber.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            message: "Status SHIPPED memerlukan nomor resi (tracking number)",
          },
          { status: 400 },
        );
      }
    }

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (courier !== undefined) updateData.courier = courier.trim();
    if (service !== undefined) updateData.service = service?.trim() || null;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber?.trim() || null;
    if (estimatedDays !== undefined) updateData.estimatedDays = estimatedDays;
    if (weightInGrams !== undefined) updateData.weight = weightInGrams;

    if (status === "SHIPPED") {
      updateData.shippedAt = new Date();
    }

    if (status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada data yang diubah",
        },
        { status: 400 },
      );
    }

    const oldValues: any = {};
    if (status !== undefined) oldValues.status = existingShipment.status;
    if (courier !== undefined) oldValues.courier = existingShipment.courier;
    if (service !== undefined) oldValues.service = existingShipment.service;
    if (trackingNumber !== undefined) oldValues.trackingNumber = existingShipment.trackingNumber;

    const [updatedShipment] = await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: updateData,
      }),
      prisma.order.update({
        where: { id: existingShipment.orderId },
        data: {
          status: updateData.status === "PENDING" ? "PROCESSING" :
            updateData.status || (existingShipment.status === "PENDING" ? "PROCESSING" : existingShipment.status),
        },
      }),
    ]);

    // Notify customer about shipment status change
    if (status && status !== existingShipment.status) {
      const statusMessages: Record<string, string> = {
        PROCESSING: `Pesanan #${existingShipment.order.orderNumber} sedang diproses oleh florist.`,
        SHIPPED: `Pesanan #${existingShipment.order.orderNumber} telah dikirim${trackingNumber || existingShipment.trackingNumber ? ` dengan nomor resi ${trackingNumber || existingShipment.trackingNumber}` : ""}.`,
        DELIVERED: `Pesanan #${existingShipment.order.orderNumber} telah sampai di tujuan. Terima kasih telah berbelanja!`,
        CANCELLED: `Pengiriman pesanan #${existingShipment.order.orderNumber} telah dibatalkan.`,
      };

      const message = statusMessages[status];
      if (message) {
        await prisma.notification.create({
          data: {
            userId: existingShipment.order.userId,
            title:
              status === "DELIVERED"
                ? "Pesanan Telah Sampai!"
                : status === "SHIPPED"
                ? "Pesanan Sedang Dikirim!"
                : status === "CANCELLED"
                ? "Pengiriman Dibatalkan"
                : "Update Status Pesanan",
            message,
            type: "SHIPMENT_UPDATE",
            link: `/orders/${existingShipment.orderId}/tracking`,
            isRead: false,
          },
        });
      }
    }

    await createAuditLog({
      userId: floristId,
      action: "UPDATE",
      entity: "Shipment",
      entityId: updatedShipment.id,
      oldValue: oldValues,
      newValue: updateData,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Shipment berhasil diperbarui",
      data: { shipment: updatedShipment },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui shipment" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    floristId: true,
                  },
                },
              },
            },
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            address: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const isOwner = shipment.order.items.some(
      (item) => item.product.floristId === floristId,
    );
    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Shipment ini bukan milik Anda",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({
      success: true,
      message: "Detail shipment berhasil diambil",
      data: { shipment },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail shipment" },
      { status: 500 },
    );
  }
}

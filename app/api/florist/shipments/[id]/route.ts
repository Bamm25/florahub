import { createAuditLog } from "@/lib/auditLog";
import { authOptions } from "@/lib/auth";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { updateShipmentStatusSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PUT untuk memperbarui status pengiriman dan nomor resi paket
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil metadata IP address dan user-agent untuk audit log
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Ambil parameter ID pengiriman dari URL
    const { id } = await params;
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateShipmentStatusSchema.parse(body);
    const { status, courier, service, trackingNumber, estimatedDays, weight } = validated;
    
    // Konversi bobot pengiriman dari kg ke gram
    const weightInGrams = weight !== undefined && weight !== null ? Math.round(weight * 1000) : undefined;

    // Cari data pengiriman eksisting di database
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

    // Validasi keberadaan data pengiriman
    if (!existingShipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pengiriman oleh florist
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

    // Validasi status pengiriman yang sudah selesai tidak dapat diubah
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

    // Validasi transisi status pengiriman yang diizinkan
    if (status && status !== existingShipment.status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
        PROCESSING: ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"],
        SHIPPED: ["PROCESSING", "DELIVERED", "CANCELLED"],
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

    // Validasi keberadaan nomor resi jika status diubah menjadi SHIPPED
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

    // Siapkan objek pembaruan data pengiriman
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (courier !== undefined) updateData.courier = courier.trim();
    if (service !== undefined) updateData.service = service?.trim() || null;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber?.trim() || null;
    if (estimatedDays !== undefined) updateData.estimatedDays = estimatedDays;
    if (weightInGrams !== undefined) updateData.weight = weightInGrams;

    if (status === "SHIPPED") {
      updateData.shippedAt = existingShipment.shippedAt || new Date();
    }

    if (status === "DELIVERED") {
      updateData.deliveredAt = new Date();
      if (!existingShipment.shippedAt) {
        updateData.shippedAt = new Date();
      }
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

    // Perbarui data pengiriman dan status pesanan dalam transaksi atomic
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

    // Kirim notifikasi perubahan status pengiriman ke pembeli
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

    // Catat aktivitas pembaruan pengiriman ke audit log
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

    // Kembalikan respon sukses pembaruan pengiriman
    return NextResponse.json({
      success: true,
      message: "Shipment berhasil diperbarui",
      data: { shipment: updatedShipment },
    });
  } catch (error) {
    // Tangani error validasi Zod, otorisasi, atau internal server error
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

// Handler HTTP GET untuk mengambil detail pengiriman berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID pengiriman dari URL
    const { id } = await params;

    // Cari data pengiriman beserta relasi order, produk, dan pembeli
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

    // Validasi keberadaan data pengiriman
    if (!shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan pengiriman oleh florist
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
    // Kembalikan respon sukses data detail pengiriman
    return NextResponse.json({
      success: true,
      message: "Detail shipment berhasil diambil",
      data: { shipment },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail shipment" },
      { status: 500 },
    );
  }
}

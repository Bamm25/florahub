import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { safeRevalidatePaths } from "@/lib/revalidate-safe";
import { reportServerError } from "@/lib/server-error-report";
import { autoExpireOverduePreOrders } from "@/lib/supply-chain/expire-preorders";
import { transferHarvestToStockSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const ACTIVE_PREORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "PAID",
  "SHIPPED",
  "DELIVERED",
] as const;

// Handler HTTP POST untuk memindahkan sisa hasil panen (setelah QC supplier) ke stok biasa
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const { id: announcementId } = await params;

    const body = await request.json();
    const validated = transferHarvestToStockSchema.parse(body);

    // Pastikan pre-order kedaluwarsa dilepas terlebih dahulu agar sisa kuota akurat.
    await autoExpireOverduePreOrders();

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const txResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "HarvestAnnouncement" WHERE id = ${announcementId} FOR UPDATE`;

      const announcement = await tx.harvestAnnouncement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        return {
          ok: false as const,
          status: 404,
          message: "Pengumuman panen tidak ditemukan",
        };
      }

      if (announcement.supplierId !== userId) {
        return {
          ok: false as const,
          status: 403,
          message: "Forbidden: Anda tidak memiliki akses ke pengumuman panen ini",
        };
      }

      if (announcement.transferredAt) {
        return {
          ok: false as const,
          status: 409,
          message:
            "Sisa panen jadwal ini sudah pernah dipindahkan ke stok biasa",
        };
      }

      const reservedAggregate = await tx.harvestPreOrder.aggregate({
        where: {
          announcementId,
          status: { in: [...ACTIVE_PREORDER_STATUSES] },
        },
        _sum: { quantity: true },
      });
      const reservedQty = reservedAggregate._sum.quantity ?? 0;
      const remaining = Math.max(
        0,
        announcement.estimatedQuantity - reservedQty,
      );

      if (remaining <= 0) {
        return {
          ok: false as const,
          status: 409,
          message: "Tidak ada sisa kuota panen yang tersedia untuk dipindahkan",
        };
      }

      if (validated.quantity > remaining) {
        return {
          ok: false as const,
          status: 400,
          message: `Jumlah melebihi sisa panen tersedia (maksimal ${remaining} tangkai).`,
        };
      }

      const now = new Date();
      const stockName = announcement.flowerName.trim();
      const stockVariety = announcement.variety?.trim() || "Standar";
      const finalPrice = validated.pricePerUnit ?? announcement.pricePerUnit;

      const existingStock = await tx.stock.findFirst({
        where: {
          supplierId: userId,
          name: { equals: stockName, mode: "insensitive" },
          variety: { equals: stockVariety, mode: "insensitive" },
        },
      });

      const targetStock = existingStock
        ? await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: { increment: validated.quantity },
              pricePerUnit: finalPrice,
              harvestDate: announcement.harvestDate,
              location:
                announcement.location ||
                existingStock.location ||
                "Kebun Mitra",
              isAvailable: true,
            },
          })
        : await tx.stock.create({
            data: {
              supplierId: userId,
              name: stockName,
              variety: stockVariety,
              quantity: validated.quantity,
              unit: "tangkai",
              pricePerUnit: finalPrice,
              harvestDate: announcement.harvestDate,
              location: announcement.location || "Kebun Mitra",
              isAvailable: true,
            },
          });

      const updatedAnnouncement = await tx.harvestAnnouncement.update({
        where: { id: announcementId },
        data: {
          isActive: false,
          transferredToStockQty: validated.quantity,
          transferredStockId: targetStock.id,
          transferredAt: now,
        },
      });

      return {
        ok: true as const,
        announcement: updatedAnnouncement,
        stock: targetStock,
        mergedIntoExisting: Boolean(existingStock),
        remainingBeforeQc: remaining,
      };
    },
    {
      maxWait: 10_000,
      timeout: 15_000,
    });

    if (!txResult.ok) {
      return NextResponse.json(
        { success: false, message: txResult.message },
        { status: txResult.status },
      );
    }

    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "HarvestAnnouncement",
      entityId: announcementId,
      newValue: {
        transferredToStockQty: validated.quantity,
        remainingBeforeQc: txResult.remainingBeforeQc,
        discardedQcQty: txResult.remainingBeforeQc - validated.quantity,
        targetStockId: txResult.stock.id,
        mergedIntoExisting: txResult.mergedIntoExisting,
        pricePerUnit: txResult.stock.pricePerUnit,
        qcNotes: validated.qcNotes || null,
      },
      ipAddress,
      userAgent,
    });

    safeRevalidatePaths([
      "/supplier/dashboard",
      "/supplier/harvest-announcements",
      "/supplier/stocks",
      "/florist/harvest-plans",
      "/florist/supplier-stocks",
    ]);

    return NextResponse.json({
      success: true,
      message: txResult.mergedIntoExisting
        ? `${validated.quantity} tangkai sisa panen digabungkan ke stok "${txResult.stock.name}" dan siap dibeli florist.`
        : `${validated.quantity} tangkai sisa panen ditambahkan sebagai stok baru "${txResult.stock.name}" dan siap dibeli florist.`,
      data: {
        announcement: txResult.announcement,
        stock: txResult.stock,
        mergedIntoExisting: txResult.mergedIntoExisting,
        transferredQuantity: validated.quantity,
      },
    });
  } catch (error) {
    reportServerError("Error transferring harvest leftover to stock:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Data input tidak valid",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    if (error instanceof Error) {
      const rawCode =
        "code" in error ? (error as Error & { code?: unknown }).code : null;
      const prismaCode = typeof rawCode === "string" ? rawCode : null;

      if (
        error.name === "PrismaClientValidationError" &&
        /(?:transferredToStockQty|transferredStockId|transferredAt)/.test(
          error.message,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Klien Prisma di server dev belum memuat skema terbaru. Silakan restart npm run dev lalu coba lagi.",
          },
          { status: 503 },
        );
      }

      if (prismaCode === "P2028") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Transaksi database melebihi batas waktu. Silakan coba lagi.",
          },
          { status: 503 },
        );
      }

      if (prismaCode === "P2022") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Kolom database belum tersinkronisasi. Jalankan npx prisma db push lalu coba lagi.",
          },
          { status: 503 },
        );
      }
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memindahkan sisa panen ke stok biasa",
      },
      { status: 500 },
    );
  }
}

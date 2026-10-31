import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateSaleSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id } = await params;
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            quantity: true,
            supplierId: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "SUPPLIER" && transaction.stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi stock Anda",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = updateSaleSchema.parse(body);
    const { status, deliveredAt } = validated;

    if (transaction.status === "PAID" || transaction.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: `Transaksi sudah ${transaction.status}, tidak dapat diubah lagi`,
        },
        { status: 400 },
      );
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (deliveredAt) updatedData.deliveredAt = new Date(deliveredAt);

    if (status === "PAID") {
      if (transaction.stock.quantity < transaction.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock tidak mencukupi. Tersedia: ${transaction.stock.quantity}, dibutuhkan: ${transaction.quantity}`,
          },
          { status: 400 },
        );
      }

      const [updatedTransaction] = await prisma.$transaction([
        prisma.stockTransaction.update({
          where: { id },
          data: updatedData,
          include: {
            stock: {
              select: {
                name: true,
                variety: true,
                quantity: true,
              },
            },
            florist: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),

        prisma.stock.update({
          where: { id: transaction.stock.id },
          data: {
            quantity: {
              decrement: transaction.quantity,
            },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Pembayaran berhasil dikonfirmasi, stock telah dikurangi",
        data: updatedTransaction,
      });
    }

    const updatedTransaction = await prisma.stockTransaction.update({
      where: { id },
      data: updatedData,
      include: {
        stock: {
          select: {
            name: true,
            variety: true,
            quantity: true,
          },
        },
        florist: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil diupdate",
      data: updatedTransaction,
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
      { success: false, message: "Gagal update transaksi" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id } = await params;
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            variety: true,
            unit: true,
            quantity: true,
            supplierId: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "SUPPLIER" && transaction.stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi stock Anda",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({
      success: true,
      message: "Detail penjualan berhasil diambil",
      data: { transaction },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail penjualan" },
      { status: 500 },
    );
  }
}

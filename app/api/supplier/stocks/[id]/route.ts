import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { updateStockSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const { id } = await params;
    const stock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke stock ini",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail stock berhasil diambil",
      data: { stock },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail stock" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const { id } = await params;

    try {
      const body = await request.json();
      const validatedData = updateStockSchema.parse(body);

      const existingStock = await prisma.stock.findUnique({
        where: { id },
        select: {
          id: true,
          supplierId: true,
        },
      });

      if (!existingStock) {
        return NextResponse.json(
          {
            success: false,
            message: "Stock tidak ditemukan",
          },
          { status: 404 },
        );
      }

      if (existingStock.supplierId !== userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: Anda tidak memiliki akses ke stock ini",
          },
          { status: 403 },
        );
      }

      const stockBeforeUpdate = await prisma.stock.findUnique({
        where: { id },
        select: {
          name: true,
          pricePerUnit: true,
        },
      });

      if (Object.keys(validatedData).length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Tidak ada data yang diubah",
          },
          { status: 400 },
        );
      }

      const updatedStock = await prisma.stock.update({
        where: { id },
        data: validatedData,
      });

      const oldValues: any = {};
      const newValues: any = {};

      if (validatedData.name !== undefined && stockBeforeUpdate) {
        oldValues.name = stockBeforeUpdate.name;
        newValues.name = validatedData.name;
      }

      if (validatedData.pricePerUnit !== undefined && stockBeforeUpdate) {
        oldValues.pricePerUnit = stockBeforeUpdate.pricePerUnit;
        newValues.pricePerUnit = validatedData.pricePerUnit;
      }

      await createAuditLog({
        userId,
        action: "UPDATE",
        entity: "Stock",
        entityId: updatedStock.id,
        oldValue: Object.keys(oldValues).length > 0 ? oldValues : null,
        newValue: Object.keys(newValues).length > 0 ? newValues : null,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: "Stock berhasil diperbarui",
        data: {
          stock: updatedStock,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui stock" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    const { id } = await params;
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const existingStock = await prisma.stock.findUnique({
      where: { id },
      select: {
        id: true,
        supplierId: true,
        name: true,
        quantity: true,
        pricePerUnit: true,
      },
    });

    if (!existingStock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingStock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke stock ini",
        },
        { status: 403 },
      );
    }

    const [inventoriesCount, transactionsCount] = await Promise.all([
      prisma.floristInventory.count({
        where: { stockId: id },
      }),
      prisma.stockTransaction.count({
        where: { stockId: id },
      }),
    ]);

    if (inventoriesCount > 0 || transactionsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat menghapus stock. Stock ini digunakan oleh ${inventoriesCount} florist inventory dan ${transactionsCount} transaksi`,
        },
        { status: 400 },
      );
    }

    await createAuditLog({
      userId,
      action: "DELETE",
      entity: "Stock",
      entityId: existingStock.id,
      oldValue: {
        name: existingStock.name,
        quantity: existingStock.quantity,
        pricePerUnit: existingStock.pricePerUnit,
      },
      ipAddress,
      userAgent,
    });

    await prisma.stock.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Stock berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus stock" },
      { status: 500 },
    );
  }
}

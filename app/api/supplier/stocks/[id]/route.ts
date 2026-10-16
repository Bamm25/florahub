import { createAuditLog } from "@/lib/auditLog";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk supplier",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
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
    console.error("Error mengambil detail stock:", error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;

    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk supplier",
        },
        { status: 403 },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const userId = (session.user as any)?.id;
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      variety,
      quantity,
      unit,
      pricePerUnit,
      harvestDate,
      expiryDate,
      location,
      isAvailable,
    } = body;

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
        quantity: true,
        pricePerUnit: true,
        isAvailable: true,
      },
    });

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama bunga harus berupa teks dan tidak boleh kosong",
        },
        { status: 400 },
      );
    }

    if (
      quantity !== undefined &&
      (typeof quantity !== "number" || quantity <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Jumlah stok harus berupa angka positif",
        },
        { status: 400 },
      );
    }

    if (
      pricePerUnit !== undefined &&
      (typeof pricePerUnit !== "number" || pricePerUnit <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Harga per unit harus berupa angka positif",
        },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (variety !== undefined) updateData.variety = variety?.trim() || null;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit?.trim() || "tangkai";
    if (pricePerUnit !== undefined) updateData.pricePerUnit = pricePerUnit;
    if (harvestDate !== undefined)
      updateData.harvestDate = new Date(harvestDate);
    if (expiryDate !== undefined)
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    if (Object.keys(updateData).length === 0) {
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
      data: updateData,
    });

    const oldValues: any = {};
    const newValues: any = {};

    if (name !== undefined && stockBeforeUpdate) {
      oldValues.name = stockBeforeUpdate.name;
      newValues.name = updateData.name;
    }

    if (quantity !== undefined && stockBeforeUpdate) {
      oldValues.quantity = stockBeforeUpdate.quantity;
      newValues.quantity = updateData.quantity;
    }

    if (pricePerUnit !== undefined && stockBeforeUpdate) {
      oldValues.pricePerUnit = stockBeforeUpdate.pricePerUnit;
      newValues.pricePerUnit = updateData.pricePerUnit;
    }

    if (isAvailable !== undefined && stockBeforeUpdate) {
      oldValues.isAvailable = stockBeforeUpdate.isAvailable;
      newValues.isAvailable = updateData.isAvailable;
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
    console.error("Error memperbarui stock:", error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk supplier",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
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
    console.error("Error menghapus stock:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus stock" },
      { status: 500 },
    );
  }
}

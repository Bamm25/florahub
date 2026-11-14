import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Skema validasi pembaruan bahan baku atau penyesuaian stok
const updateRawMaterialSchema = z.object({
  action: z.enum(["UPDATE_DETAILS", "ADJUST_STOCK"]).default("UPDATE_DETAILS"),
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  pricePerUnit: z.number().int().min(0).optional(),
  minThreshold: z.number().int().min(0).optional(),
  location: z.string().optional().nullable(),
  adjustmentType: z.enum(["ADD", "SUBTRACT", "SET"]).optional(),
  amount: z.number().int().min(0).optional(),
  reason: z.string().optional(),
});

// Handler HTTP GET untuk mengambil detail bahan baku florist berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    const inventory = await prisma.floristInventory.findUnique({
      where: { id },
      include: {
        stock: true,
        productComponents: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!inventory || inventory.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        inventory,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui informasi atau menyesuaikan stok bahan baku
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Ambil parameter ID inventaris dari URL
    const { id } = await params;
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateRawMaterialSchema.parse(body);

    // Cari data inventaris bahan baku florist
    const inventory = await prisma.floristInventory.findUnique({
      where: { id },
      include: { stock: true },
    });

    // Validasi keberadaan dan hak akses bahan baku
    if (!inventory || inventory.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 },
      );
    }

    // Tangani penyesuaian kuantitas stok bahan baku
    if (validated.action === "ADJUST_STOCK") {
      const type = validated.adjustmentType || "ADD";
      const amount = validated.amount ?? 0;

      let newQuantity = inventory.quantity;
      if (type === "ADD") {
        newQuantity += amount;
      } else if (type === "SUBTRACT") {
        newQuantity = Math.max(0, newQuantity - amount);
      } else if (type === "SET") {
        newQuantity = Math.max(0, amount);
      }

      // Mutasi penyesuaian kuantitas dalam transaksi database atomic
      const updated = await prisma.$transaction(async (tx) => {
        // Update stok di inventory florist
        const updatedInv = await tx.floristInventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            lastRestockDate: type === "ADD" ? new Date() : inventory.lastRestockDate,
          },
          include: { stock: true },
        });

        // Sinkronkan kuantitas ke record stock jika ini stok mandiri florist
        if (inventory.stock.supplierId === userId) {
          await tx.stock.update({
            where: { id: inventory.stockId },
            data: { quantity: newQuantity },
          });
        }

        return updatedInv;
      });

      return NextResponse.json({
        success: true,
        message: `Stok ${inventory.stock.name} berhasil diperbarui menjadi ${newQuantity} ${inventory.stock.unit}`,
        data: {
          id: updated.id,
          quantity: updated.quantity,
          unit: updated.stock.unit,
        },
      });
    }

    // Perbarui metadata informasi bahan baku
    const updated = await prisma.$transaction(async (tx) => {
      // Perbarui data inventaris florist
      const updatedInv = await tx.floristInventory.update({
        where: { id: inventory.id },
        data: {
          minThreshold: validated.minThreshold !== undefined ? validated.minThreshold : inventory.minThreshold,
          location: validated.location !== undefined ? validated.location : inventory.location,
        },
      });

      // Perbarui data stok jika dimiliki florist secara mandiri
      if (inventory.stock.supplierId === userId) {
        await tx.stock.update({
          where: { id: inventory.stockId },
          data: {
            name: validated.name?.trim() || inventory.stock.name,
            variety: validated.category?.trim() || inventory.stock.variety,
            unit: validated.unit?.trim().toLowerCase() || inventory.stock.unit,
            pricePerUnit: validated.pricePerUnit !== undefined ? validated.pricePerUnit : inventory.stock.pricePerUnit,
            location: validated.location !== undefined ? validated.location : inventory.stock.location,
          },
        });
      }

      return updatedInv;
    });

    // Kembalikan respon sukses pembaruan data bahan baku
    return NextResponse.json({
      success: true,
      message: "Data bahan baku berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    reportServerError("[PUT_RAW_MATERIALS_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Validasi gagal", errors: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui bahan baku" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus bahan baku mandiri florist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    const inventory = await prisma.floristInventory.findUnique({
      where: { id },
      include: {
        stock: true,
        productComponents: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!inventory || inventory.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bahan baku tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi apakah bahan baku masih terhubung ke BOM produk aktif
    if (inventory.productComponents.length > 0) {
      const productNames = inventory.productComponents
        .map((pc) => pc.product.name)
        .join(", ");

      return NextResponse.json(
        {
          success: false,
          message: `Bahan baku "${inventory.stock.name}" tidak dapat dihapus karena masih digunakan pada BOM produk: ${productNames}. Hapus komponen dari produk terlebih dahulu.`,
        },
        { status: 400 },
      );
    }

    // Hapus FloristInventory dan Stock mandiri terkait
    await prisma.$transaction(async (tx) => {
      await tx.floristInventory.delete({
        where: { id: inventory.id },
      });

      if (inventory.stock.supplierId === userId) {
        await tx.stock.delete({
          where: { id: inventory.stockId },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Bahan baku "${inventory.stock.name}" berhasil dihapus`,
    });
  } catch (error: any) {
    reportServerError("[DELETE_RAW_MATERIALS_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus bahan baku" },
      { status: 500 },
    );
  }
}

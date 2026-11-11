import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema validasi produksi produk
const produceSchema = z.object({
  quantity: z.number().int().positive("Jumlah harus lebih dari 0"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    const body = await request.json();
    const { quantity } = produceSchema.parse(body);

    // Cek product ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productComponents: {
          include: {
            inventory: {
              include: {
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke produk ini" },
        { status: 403 }
      );
    }

    // Cek apakah produk punya BOM
    if (product.productComponents.length === 0) {
      return NextResponse.json(
        { success: false, message: "Produk ini belum memiliki Bill of Materials (BOM). Tambahkan komponen terlebih dahulu." },
        { status: 400 }
      );
    }

    // Cek ketersediaan bahan baku untuk produksi
    const insufficientMaterials: string[] = [];
    
    for (const component of product.productComponents) {
      const requiredQty = component.quantity * quantity;
      const availableQty = component.inventory.quantity;

      if (availableQty < requiredQty) {
        insufficientMaterials.push(
          `${component.inventory.stock.name} (butuh ${requiredQty} ${component.inventory.stock.unit}, tersedia ${availableQty} ${component.inventory.stock.unit})`
        );
      }
    }

    if (insufficientMaterials.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Bahan baku tidak mencukupi untuk produksi",
          data: { insufficientMaterials },
        },
        { status: 400 }
      );
    }

    // Lakukan produksi dalam transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kurangi inventory bahan baku
      const inventoryUpdates = [];
      const lowStockNotifications = [];

      for (const component of product.productComponents) {
        const consumedQty = component.quantity * quantity;
        const newQty = component.inventory.quantity - consumedQty;

        const updatedInventory = await tx.floristInventory.update({
          where: { id: component.inventory.id },
          data: { quantity: newQty },
          include: { stock: true },
        });

        inventoryUpdates.push({
          material: updatedInventory.stock.name,
          consumed: consumedQty,
          remaining: newQty,
          unit: updatedInventory.stock.unit,
        });

        // Trigger notifikasi low stock
        if (newQty < updatedInventory.minThreshold) {
          lowStockNotifications.push(
            tx.notification.create({
              data: {
                userId: product.floristId,
                title: "Stok Bahan Baku Rendah!",
                message: `Stok ${updatedInventory.stock.name} hanya tersisa ${newQty} ${updatedInventory.stock.unit} setelah produksi ${quantity} ${product.name}. Segera lakukan restock (minimum: ${updatedInventory.minThreshold} ${updatedInventory.stock.unit}).`,
                type: "LOW_STOCK_ALERT",
                link: `/florist/inventory`,
                isRead: false,
              },
            })
          );
        }
      }

      // Tunggu semua notifikasi low stock dibuat
      await Promise.all(lowStockNotifications);

      // 2. Tambah stock produk jadi
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity },
        },
      });

      return {
        product: updatedProduct,
        inventoryUpdates,
        lowStockTriggered: lowStockNotifications.length > 0,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memproduksi ${quantity} ${product.name}`,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validasi gagal", errors: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof NextResponse) {
      return error;
    }

    console.error("[Produce Error]", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproduksi produk" },
      { status: 500 }
    );
  }
}

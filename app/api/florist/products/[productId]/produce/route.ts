import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { safeRevalidatePaths } from "@/lib/revalidate-safe";
import prisma from "@/lib/prisma";
import { produceProductSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP POST untuk memproduksi stok produk jadi dari bahan baku inventaris
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Ambil parameter ID produk dari URL
    const { productId } = await params;
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST"]);

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const { quantity } = produceProductSchema.parse(body);

    // Cari data produk beserta komponen bahan baku penyusunnya
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

    // Validasi keberadaan data produk
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (product.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke produk ini" },
        { status: 403 },
      );
    }

    // Validasi keberadaan komponen bahan baku (Bill of Materials) pada produk
    if (product.productComponents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk ini belum memiliki Bill of Materials (BOM). Tambahkan komponen terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    // Periksa kecukupan stok bahan baku untuk jumlah produksi yang diminta
    const insufficientMaterials: string[] = [];

    for (const component of product.productComponents) {
      const requiredQty = component.quantity * quantity;
      const availableQty = component.inventory.quantity;

      if (availableQty < requiredQty) {
        insufficientMaterials.push(
          `${component.inventory.stock.name} (butuh ${requiredQty} ${component.inventory.stock.unit}, tersedia ${availableQty} ${component.inventory.stock.unit})`,
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
        { status: 400 },
      );
    }

    // Jalankan mutasi produksi dalam transaksi database atomic
    const result = await prisma.$transaction(async (tx) => {
      // Kurangi kuantitas stok bahan baku di inventaris florist
      const inventoryUpdates = [];
      const lowStockNotifications = [];

      for (const component of product.productComponents) {
        const consumedQty = component.quantity * quantity;

        // Pengurangan atomik dengan verifikasi stok mencukupi mencegah lost-update pada produksi paralel
        const deducted = await tx.floristInventory.updateMany({
          where: {
            id: component.inventory.id,
            floristId: userId,
            quantity: { gte: consumedQty },
          },
          data: { quantity: { decrement: consumedQty } },
        });

        if (deducted.count === 0) {
          throw new Error(`INSUFFICIENT_MATERIAL:${component.inventory.stock.name}`);
        }

        const updatedInventory = await tx.floristInventory.findUnique({
          where: { id: component.inventory.id },
          include: { stock: true },
        });

        if (!updatedInventory) {
          throw new Error(`INSUFFICIENT_MATERIAL:${component.inventory.stock.name}`);
        }

        const newQty = updatedInventory.quantity;

        // Sinkronkan juga tabel stock jika bahan baku dimiliki florist secara mandiri
        if (updatedInventory.stock.supplierId === userId) {
          await tx.stock.update({
            where: { id: updatedInventory.stockId },
            data: { quantity: newQty },
          });
        }

        inventoryUpdates.push({
          material: updatedInventory.stock.name,
          consumed: consumedQty,
          remaining: newQty,
          unit: updatedInventory.stock.unit,
        });

        // Buat notifikasi peringatan jika sisa bahan baku di bawah ambang batas
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
            }),
          );
        }
      }

      // Tunggu hingga seluruh notifikasi stok rendah berhasil dibuat
      await Promise.all(lowStockNotifications);

      // Tambahkan kuantitas stok produk jadi
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

    safeRevalidatePaths(["/", "/products", "/stores", `/stores/${userId}`]);

    // Kembalikan respon sukses proses produksi produk
    return NextResponse.json({
      success: true,
      message: `Berhasil memproduksi ${quantity} ${product.name}`,
      data: result,
    });
  } catch (error) {
    // Tangani error validasi Zod, otorisasi, atau internal server error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validasi gagal", errors: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof NextResponse) {
      return error;
    }

    if (
      error instanceof Error &&
      error.message.startsWith("INSUFFICIENT_MATERIAL:")
    ) {
      const materialName = error.message.split(":")[1] || "bahan baku";
      return NextResponse.json(
        {
          success: false,
          message: `Stok ${materialName} tidak mencukupi untuk produksi`,
        },
        { status: 400 },
      );
    }

    reportServerError("[Produce Error]", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproduksi produk" },
      { status: 500 },
    );
  }
}

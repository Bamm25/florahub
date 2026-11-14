import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Skema validasi kuantitas produksi produk
const produceSchema = z.object({
  quantity: z.number().int().positive("Jumlah harus lebih dari 0"),
});

// Handler HTTP POST untuk memproduksi stok produk jadi dari bahan baku inventaris
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // Ambil parameter ID produk dari URL
    const { productId } = await params;
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const { quantity } = produceSchema.parse(body);

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
        { status: 404 }
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke produk ini" },
        { status: 403 }
      );
    }

    // Validasi keberadaan komponen bahan baku (Bill of Materials) pada produk
    if (product.productComponents.length === 0) {
      return NextResponse.json(
        { success: false, message: "Produk ini belum memiliki Bill of Materials (BOM). Tambahkan komponen terlebih dahulu." },
        { status: 400 }
      );
    }

    // Periksa kecukupan stok bahan baku untuk jumlah produksi yang diminta
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

    // Jalankan mutasi produksi dalam transaksi database atomic
    const result = await prisma.$transaction(async (tx) => {
      // Kurangi kuantitas stok bahan baku di inventaris florist
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
            })
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
        { status: 400 }
      );
    }

    if (error instanceof NextResponse) {
      return error;
    }

    reportServerError("[Produce Error]", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproduksi produk" },
      { status: 500 }
    );
  }
}

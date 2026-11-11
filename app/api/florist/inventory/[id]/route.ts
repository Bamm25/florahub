import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateInventorySchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil detail inventaris florist berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID inventaris dari URL
    const { id } = await params;

    // Cari data inventaris beserta relasi stok supplier dan komponen produk
    const inventory = await prisma.floristInventory.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        productComponents: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    // Validasi keberadaan data inventaris
    if (!inventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan inventaris oleh florist
    if (userRole === "FLORIST" && inventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke inventory ini",
        },
        { status: 403 },
      );
    }

    // Kembalikan respon sukses data detail inventaris beserta status stok menipis
    return NextResponse.json({
      success: true,
      message: "Detail inventory berhasil diambil",
      data: {
        inventory: {
          ...inventory,
          isLowStock: inventory.quantity < inventory.minThreshold,
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail inventory" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data kuantitas atau lokasi inventaris florist
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID inventaris dari URL
    const { id } = await params;
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validatedData = updateInventorySchema.parse(body);
    const { quantity, location, notes } = validatedData;

    // Cari data inventaris eksisting di database
    const existingInventory = await prisma.floristInventory.findUnique({
      where: { id },
    });

    // Validasi keberadaan data inventaris
    if (!existingInventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan inventaris oleh florist
    if (userRole === "FLORIST" && existingInventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses untuk mengubah inventory ini",
        },
        { status: 403 },
      );
    }

    // Siapkan objek perubahan data inventaris
    const updateData: any = {};

    if (quantity !== undefined) {
      updateData.quantity = quantity;
      updateData.lastRestockDate = new Date();
    }
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    // Perbarui data inventaris di database
    const inventory = await prisma.floristInventory.update({
      where: { id },
      data: updateData,
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Kirim notifikasi peringatan jika kuantitas inventaris turun di bawah ambang batas minimum
    if (
      quantity !== undefined &&
      inventory.quantity < inventory.minThreshold
    ) {
      // Periksa apakah notifikasi peringatan serupa yang belum dibaca sudah ada
      const existingAlert = await prisma.notification.findFirst({
        where: {
          userId: inventory.floristId,
          type: "LOW_STOCK_ALERT",
          isRead: false,
          link: `/florist/inventory`,
          message: { contains: inventory.stock.name },
        },
      });

      if (!existingAlert) {
        await prisma.notification.create({
          data: {
            userId: inventory.floristId,
            title: "Stok Rendah!",
            message: `Stok ${inventory.stock.name} hanya tersisa ${inventory.quantity} ${inventory.stock.unit}. Segera lakukan restock (minimum: ${inventory.minThreshold} ${inventory.stock.unit}).`,
            type: "LOW_STOCK_ALERT",
            link: `/florist/inventory`,
            isRead: false,
          },
        });
      }
    }

    // Kembalikan respon sukses pembaruan data inventaris
    return NextResponse.json({
      success: true,
      message: "Inventory berhasil diperbarui",
      data: {
        inventory: {
          ...inventory,
          isLowStock: inventory.quantity < inventory.minThreshold,
        },
      },
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
      { success: false, message: "Gagal memperbarui inventory" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus inventaris florist beserta relasi komponennya
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID inventaris dari URL
    const { id } = await params;

    // Cari data inventaris eksisting di database
    const existingInventory = await prisma.floristInventory.findUnique({
      where: { id },
    });

    // Validasi keberadaan data inventaris
    if (!existingInventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan inventaris oleh florist
    if (userRole === "FLORIST" && existingInventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses untuk mengubah inventory ini",
        },
        { status: 403 },
      );
    }

    // Hitung jumlah komponen produk terkait yang akan terhapus
    const componentsCount = await prisma.productComponent.count({
      where: {
        inventoryId: id,
      },
    });

    // Hapus data inventaris dari database
    await prisma.floristInventory.delete({
      where: { id },
    });

    // Kembalikan respon sukses penghapusan inventaris
    return NextResponse.json({
      success: true,
      message:
        componentsCount > 0
          ? `Inventory berhasil dihapus (${componentsCount} product components terkait juga dihapus)`
          : "Inventory berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus inventory" },
      { status: 500 },
    );
  }
}

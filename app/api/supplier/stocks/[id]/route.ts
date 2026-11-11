import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { updateStockSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP GET untuk mengambil detail stok bunga berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses supplier
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    // Ambil parameter ID stok dari URL
    const { id } = await params;
    // Cari data stok berdasarkan ID
    const stock = await prisma.stock.findUnique({
      where: { id },
    });

    // Validasi keberadaan data stok
    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan stok oleh supplier
    if (stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke stock ini",
        },
        { status: 403 },
      );
    }

    // Kembalikan respon sukses data detail stok
    return NextResponse.json({
      success: true,
      message: "Detail stock berhasil diambil",
      data: { stock },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail stock" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data stok bunga beserta pencatatan audit log
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses supplier
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    // Ambil metadata IP address dan user-agent untuk audit log
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    // Ambil parameter ID stok dari URL
    const { id } = await params;

    try {
      // Parsing dan validasi request body menggunakan skema Zod
      const body = await request.json();
      const validatedData = updateStockSchema.parse(body);

      // Cari data stok eksisting di database
      const existingStock = await prisma.stock.findUnique({
        where: { id },
        select: {
          id: true,
          supplierId: true,
        },
      });

      // Validasi keberadaan data stok
      if (!existingStock) {
        return NextResponse.json(
          {
            success: false,
            message: "Stock tidak ditemukan",
          },
          { status: 404 },
        );
      }

      // Validasi hak kepemilikan stok oleh supplier
      if (existingStock.supplierId !== userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: Anda tidak memiliki akses ke stock ini",
          },
          { status: 403 },
        );
      }

      // Ambil data stok sebelum diperbarui untuk perbandingan audit log
      const stockBeforeUpdate = await prisma.stock.findUnique({
        where: { id },
        select: {
          name: true,
          pricePerUnit: true,
        },
      });

      // Validasi kelengkapan perubahan data
      if (Object.keys(validatedData).length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Tidak ada data yang diubah",
          },
          { status: 400 },
        );
      }

      // Perbarui data stok di database
      const updatedStock = await prisma.stock.update({
        where: { id },
        data: validatedData,
      });

      // Siapkan rekaman perubahan nilai lama dan baru untuk audit log
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

      // Catat aktivitas pembaruan stok ke audit log
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

      // Kembalikan respon sukses pembaruan stok
      return NextResponse.json({
        success: true,
        message: "Stock berhasil diperbarui",
        data: {
          stock: updatedStock,
        },
      });
    } catch (error) {
      // Tangani error validasi skema Zod
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui stock" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus data stok bunga jika belum digunakan
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses supplier
    const { userId } = await requireAuth(request, ["SUPPLIER"]);
    // Ambil parameter ID stok dari URL
    const { id } = await params;
    // Ambil metadata IP address dan user-agent untuk audit log
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Cari data stok eksisting di database
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

    // Validasi keberadaan data stok
    if (!existingStock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan stok oleh supplier
    if (existingStock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke stock ini",
        },
        { status: 403 },
      );
    }

    // Validasi keterkaitan stok pada inventaris florist dan riwayat transaksi
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

    // Catat aktivitas penghapusan stok ke audit log
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

    // Hapus data stok dari database
    await prisma.stock.delete({
      where: { id },
    });

    // Kembalikan respon sukses penghapusan stok
    return NextResponse.json({
      success: true,
      message: "Stock berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus stock" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateSaleSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PUT untuk memperbarui status transaksi penjualan stok oleh supplier
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter ID transaksi dari URL
    const { id } = await params;
    // Cari data transaksi stok beserta informasi stok dan florist
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

    // Validasi keberadaan data transaksi
    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan transaksi oleh supplier
    if (userRole === "SUPPLIER" && transaction.stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi stock Anda",
        },
        { status: 403 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updateSaleSchema.parse(body);
    const { status, deliveredAt } = validated;

    // Validasi status transaksi yang sudah final
    if (transaction.status === "PAID" || transaction.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: `Transaksi sudah ${transaction.status}, tidak dapat diubah lagi`,
        },
        { status: 400 },
      );
    }

    // Siapkan objek pembaruan data transaksi
    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (deliveredAt) updatedData.deliveredAt = new Date(deliveredAt);

    // Proses konfirmasi pembayaran dan pengurangan kuantitas stok jika status PAID
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

    // Perbarui transaksi stok jika bukan perubahan ke status PAID
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
    // Kembalikan respon sukses pembaruan transaksi
    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil diupdate",
      data: updatedTransaction,
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
      { success: false, message: "Gagal update transaksi" },
      { status: 500 },
    );
  }
}

// Handler HTTP GET untuk mengambil detail data transaksi penjualan berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses supplier atau admin
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    // Ambil parameter ID transaksi dari URL
    const { id } = await params;
    // Cari data transaksi stok beserta informasi stok dan florist
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

    // Validasi keberadaan data transaksi
    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan transaksi oleh supplier
    if (userRole === "SUPPLIER" && transaction.stock.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi stock Anda",
        },
        { status: 403 },
      );
    }
    // Kembalikan respon sukses detail transaksi penjualan
    return NextResponse.json({
      success: true,
      message: "Detail penjualan berhasil diambil",
      data: { transaction },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail penjualan" },
      { status: 500 },
    );
  }
}

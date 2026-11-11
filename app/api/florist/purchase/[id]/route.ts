import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updatePurchaseSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PUT untuk mengunggah bukti pembayaran transaksi pembelian stok
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID transaksi dari URL
    const { id } = await params;

    // Cari data transaksi stok beserta informasi stok dan supplier
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            name: true,
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
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

    // Validasi hak kepemilikan transaksi oleh florist
    if (transaction.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi Anda",
        },
        { status: 403 },
      );
    }

    // Validasi status transaksi harus PENDING untuk upload bukti pembayaran
    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat mengupload bukti bayar: status transaksi saat ini "${transaction.status}"`,
        },
        { status: 400 },
      );
    }

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = updatePurchaseSchema.parse(body);
    const { paymentProof } = validated;

    // Perbarui URL bukti pembayaran pada data transaksi
    const updatedTransaction = await prisma.stockTransaction.update({
      where: { id },
      data: {
        paymentProof: paymentProof.trim(),
      },
      include: {
        stock: {
          select: {
            name: true,
            variety: true,
          },
        },
      },
    });
    // Kembalikan respon sukses pengunggahan bukti bayar
    return NextResponse.json({
      success: true,
      message:
        "Bukti pembayaran berhasil diupload, menunggu konfirmasi supplier",
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
      { success: false, message: "Gagal upload bukti bayar" },
      { status: 500 },
    );
  }
}

// Handler HTTP GET untuk mengambil detail data transaksi pembelian stok berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID transaksi dari URL
    const { id } = await params;

    // Cari data transaksi stok beserta informasi stok dan supplier
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            variety: true,
            unit: true,
            pricePerUnit: true,
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

    // Validasi hak kepemilikan transaksi oleh florist
    if (transaction.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi Anda",
        },
        { status: 403 },
      );
    }

    // Kembalikan respon sukses data detail transaksi pembelian
    return NextResponse.json({
      success: true,
      message: "Detail transaksi berhasil diambil",
      data: { transaction },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail transaksi" },
      { status: 500 },
    );
  }
}

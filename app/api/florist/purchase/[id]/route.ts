import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json({ success: false, message: "Pembayaran pasokan hanya melalui Midtrans." }, { status: 410 });
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

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Payment is verified by Midtrans; shipping by Biteship; receipt by the buyer.
// Never allow a supplier/admin request to manufacture these transitions.
export async function PUT(request: Request) {
  try {
    await requireAuth(request, ["SUPPLIER", "ADMIN"]);
    return NextResponse.json(
      { success: false, message: "Status pembayaran dan pengiriman hanya dapat diperbarui oleh Midtrans/Biteship atau konfirmasi penerimaan florist" },
      { status: 403 },
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ success: false, message: "Gagal update transaksi" }, { status: 500 });
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

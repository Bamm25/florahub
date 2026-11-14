import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils/formatters";
import { NextResponse } from "next/server";
import { createPurchaseSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP POST untuk membuat transaksi pembelian stok dari supplier
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = createPurchaseSchema.parse(body);
    const { stockId, quantity } = validated;

    // Cari data stok bunga supplier
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    // Validasi keberadaan data stok
    if (!stock) {
      return NextResponse.json(
        { success: false, message: "Stok tidak ditemukan" },
        { status: 404 },
      );
    }

    // Hanya stok katalog milik supplier yang tersedia bisa dibeli langsung.
    if (!stock.isAvailable || stock.quantity <= 0 || stock.supplierId === userId) {
      return NextResponse.json(
        { success: false, message: "Pasokan supplier tidak tersedia untuk pembelian langsung." },
        { status: 400 },
      );
    }

    // Validasi ketersediaan kuantitas stok supplier
    if (stock.quantity < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${stock.quantity} tangkai, diminta: ${quantity} tangkai`,
        },
        { status: 400 },
      );
    }

    // Hitung total harga transaksi pembelian stok
    const totalPrice = stock.pricePerUnit * quantity;

    // Buat data transaksi pembelian stok baru di database
    const transaction = await prisma.stockTransaction.create({
      data: {
        stockId,
        floristId: userId,
        quantity,
        pricePerUnit: stock.pricePerUnit,
        totalPrice,
        status: "PENDING",
      },
      include: {
        stock: {
          select: {
            name: true,
            variety: true,
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

    // Kirim notifikasi ke supplier kebun
    await prisma.notification.create({
      data: {
        userId: stock.supplierId,
        title: "Pesanan Pasokan Bunga Baru!",
        message: `Florist ${transaction.florist.name} memesan ${quantity} tangkai ${stock.name} (${formatRupiah(totalPrice)}). Silakan periksa di menu Penjualan & Pembayaran.`,
        type: "ORDER_CREATED",
        link: "/supplier/sales",
        isRead: false,
      },
    });

    // Kembalikan respon sukses pembuatan transaksi pembelian
    return NextResponse.json(
      {
        success: true,
        message: "Pesanan stok berhasil dibuat, menunggu pembayaran",
        data: transaction,
      },
      { status: 201 },
    );
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
      { success: false, message: "Gagal membeli stok" },
      { status: 500 },
    );
  }
}

// Handler HTTP GET untuk mengambil riwayat transaksi pembelian stok florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter filter status, stok, dan paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status");
    const stockId = searchParams.get("stockId");
    // Susun filter query riwayat pembelian
    const whereClause: any = {
      floristId: userId,
    };

    if (status) whereClause.status = status;
    if (stockId) whereClause.stockId = stockId;

    // Ambil data riwayat transaksi stok beserta relasi stok dan supplier
    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: whereClause,
        include: {
          stock: {
            select: {
              id: true,
              name: true,
              variety: true,
              unit: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockTransaction.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Kembalikan respon sukses riwayat pembelian stok
    return NextResponse.json({
      success: true,
      message: "Riwayat pembelian berhasil diambil",
      data: {
        total,
        page,
        limit,
        totalPages,
        transactions,
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat pembelian" },
      { status: 500 },
    );
  }
}

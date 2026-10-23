import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const body = await request.json();
    const { stockId, quantity } = body;

    if (typeof stockId !== "string" || stockId.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "ID stok wajib diisi dan harus berupa teks",
        },
        { status: 400 },
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Jumlah pembelian harus berupa angka positif",
        },
        { status: 400 },
      );
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      return NextResponse.json(
        { success: false, message: "Stok tidak ditemukan" },
        { status: 404 },
      );
    }

    if (stock.quantity < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Tersedia: ${stock.quantity} tangkai, diminta: ${quantity} tangkai`,
        },
        { status: 400 },
      );
    }

    const totalPrice = stock.pricePerUnit * quantity;

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
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesanan stok berhasil dibuat, menunggu pembayaran",
        data: transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal membeli stok" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status");
    const stockId = searchParams.get("stockId");
    const whereClause: any = {
      floristId: userId,
    };

    if (status) whereClause.status = status;
    if (stockId) whereClause.stockId = stockId;

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
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat pembelian" },
      { status: 500 },
    );
  }
}

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "FLORIST") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya florist yang dapat membeli stok dari supplier",
        },
        { status: 403 },
      );
    }

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
    const userId = (session.user as any)?.id;

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: { id: stockId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      const newTransaction = await tx.stockTransaction.create({
        data: {
          stockId: stockId,
          floristId: userId,
          quantity: quantity,
          pricePerUnit: stock.pricePerUnit,
          totalPrice: totalPrice,
          status: "PAID",
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

      return newTransaction;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pembelian stok berhasil",
        data: transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error membeli stok:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membeli stok" },
      { status: 500 },
    );
  }
}


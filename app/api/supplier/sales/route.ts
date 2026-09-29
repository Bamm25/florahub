import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
    if (userRole !== "SUPPLIER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya supplier yang dapat melihat riwayat penjualan",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;

    const sales = await prisma.stockTransaction.findMany({
      where: {
        stock: {
          supplierId: userId,
        },
      },
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            variety: true,
            pricePerUnit: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error("Error mengambil riwayat penjualan:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil riwayat penjualan" },
      { status: 500 },
    );
  }
}

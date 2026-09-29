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
    if (userRole !== "FLORIST") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya florist yang dapat melihat produk miliknya",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;

    const products = await prisma.product.findMany({
      where: { floristId: userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error mengambil produk florist:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data produk" },
      { status: 500 },
    );
  }
}

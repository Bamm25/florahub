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
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat melihat produk",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const whereClause: any = {
      isActive: true,
      stock: {
        gt: 0,
      },
    };

    if (categoryId && typeof categoryId === "string") {
      whereClause.categoryId = categoryId;
    }

    if (search && typeof search === "string") {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
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
      data: products,
    });
  } catch (error) {
    console.error("Error mengambil katalog produk:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil katalog produk" },
      { status: 500 },
    );
  }
}

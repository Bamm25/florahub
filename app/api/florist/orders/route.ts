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
          message: "Forbidden: Hanya florist yang dapat melihat pesanan masuk",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              floristId: userId,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                floristId: true,
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            method: true,
          },
        },
        shipment: {
          select: {
            status: true,
            courier: true,
            trackingNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error mengambil pesanan florist:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pesanan" },
      { status: 500 },
    );
  }
}

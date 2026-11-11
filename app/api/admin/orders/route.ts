import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar pesanan seluruh sistem oleh admin
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter paginasi dan filter dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const statusParam = searchParams.get("status");
    const isPreorderParam = searchParams.get("isPreorder");
    const whereClause: any = {};

    // Filter berdasarkan status pesanan jika ada
    if (
      statusParam &&
      typeof statusParam === "string" &&
      statusParam.trim() !== ""
    ) {
      whereClause.status = statusParam.trim();
    }
    // Filter berdasarkan jenis pesanan preorder jika ada
    if (isPreorderParam !== null) {
      whereClause.isPreorder = isPreorderParam === "true";
    }

    // Ambil data daftar pesanan beserta relasi user, items, payment, shipment, dan total data
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
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
                  price: true,
                  image: true,
                },
              },
            },
          },
          payment: true,
          shipment: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({
        where: whereClause,
      }),
    ]);

    // Kembalikan respon sukses beserta data paginasi pesanan
    return NextResponse.json({
      success: true,
      message: "Daftar pesanan berhasil diambil",
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data pesanan",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar pesanan florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter filter status dan paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    // Susun filter query pesanan florist
    const whereClause: any = {
      items: {
        some: {
          product: {
            floristId: userId,
          },
        },
      },
    };
    if (status) whereClause.status = status;

    // Ambil daftar pesanan florist beserta relasi pembeli, produk, pembayaran, pengiriman, dan total data
    const [orders, total] = await Promise.all([
      await prisma.order.findMany({
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.order.count({
        where: whereClause,
      }),
    ]);

    // Kembalikan respon sukses beserta data paginasi pesanan florist
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
      { success: false, message: "Gagal mengambil data pesanan" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const roleParams = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (roleParams && Object.values(Role).includes(roleParams as Role)) {
      whereClause.role = roleParams as Role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Daftar pengguna berhasil diambil",
      data: {
        users,
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
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data pengguna",
      },
      { status: 500 },
    );
  }
}

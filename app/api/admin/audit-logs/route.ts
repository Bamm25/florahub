import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const entity = searchParams.get("entity") || undefined;
    const action = searchParams.get("action") || undefined;
    const filterUserId = searchParams.get("userId") || undefined;

    const whereClause: any = {};
    if (filterUserId) {
      whereClause.userId = filterUserId;
    }
    if (entity) {
      whereClause.entity = entity;
    }
    if (action) {
      whereClause.action = action;
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ]);
    return NextResponse.json({
      success: true,
      message: "Daftar audit log berhasil diambil",
      data: {
        logs,
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
      { success: false, message: "Gagal mengambil audit log" },
      { status: 500 },
    );
  }
}

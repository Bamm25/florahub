import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar audit log sistem
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    // Ambil parameter filter dan paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const entity = searchParams.get("entity") || undefined;
    const action = searchParams.get("action") || undefined;
    const filterUserId = searchParams.get("userId") || undefined;

    // Susun filter query audit log
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
    // Ambil daftar audit log dan total data secara paralel
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
    // Kembalikan respon sukses beserta data paginasi
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
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil audit log" },
      { status: 500 },
    );
  }
}

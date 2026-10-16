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
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk admin",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const userId = searchParams.get("userId") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const action = searchParams.get("action") || undefined;

    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
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
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ]);
    return NextResponse.json({
      success: true,
      message: "Daftar audit log berhasil diambil",
      data: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
        logs: logs,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil audit log" },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { adminUserQuerySchema } from "@/lib/validations/schemas";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mencari dan memfilter pengguna oleh admin
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const parsed = adminUserQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Filter pengguna tidak valid" },
        { status: 400 },
      );
    }

    const { page, limit, role, search } = parsed.data;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
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
    if (error instanceof NextResponse) return error;

    reportServerError("Admin users list failed", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengguna" },
      { status: 500 },
    );
  }
}

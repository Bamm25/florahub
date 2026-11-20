import { sanitizeAuditPayload } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { maskEmail, maskIpAddress } from "@/lib/utils/masking";
import { adminAuditLogQuerySchema } from "@/lib/validations/schemas";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET read-only untuk mengambil daftar audit log terfilter & tersanitasi oleh admin
export async function GET(request: Request) {
  try {
    await requireAuth(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const rawAction = searchParams.get("action")?.trim();
    const rawEntity = searchParams.get("entity")?.trim();
    const rawUserId = searchParams.get("userId")?.trim();
    const rawFrom = searchParams.get("from")?.trim();
    const rawTo = searchParams.get("to")?.trim();
    const rawSearch = searchParams.get("search")?.trim();

    const parsed = adminAuditLogQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      action: rawAction || undefined,
      entity: rawEntity || undefined,
      userId: rawUserId || undefined,
      from: rawFrom || undefined,
      to: rawTo || undefined,
      search: rawSearch || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Filter audit log tidak valid" },
        { status: 400 },
      );
    }

    const { page, limit, action, entity, userId, from, to, search } =
      parsed.data;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.AuditLogWhereInput = {
      ...(entity
        ? { entity: { equals: entity, mode: "insensitive" } }
        : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { entityId: { contains: search, mode: "insensitive" } },
              { entity: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const whereClause: Prisma.AuditLogWhereInput = {
      ...baseWhere,
      ...(action ? { action } : {}),
    };

    const [rows, total, groupedActions] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          oldValue: true,
          newValue: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
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
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.auditLog.count({ where: whereClause }),
      typeof prisma.auditLog.groupBy === "function"
        ? prisma.auditLog.groupBy({
            by: ["action"],
            where: baseWhere,
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const actionCounts: Record<string, number> = {
      ALL: 0,
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      PAYMENT: 0,
      LOGIN: 0,
      LOGOUT: 0,
    };
    for (const row of groupedActions as Array<{
      action: string;
      _count: { _all: number };
    }>) {
      const countVal = row._count?._all ?? 0;
      actionCounts[row.action] = countVal;
      actionCounts.ALL += countVal;
    }

    const logs = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      oldValue: sanitizeAuditPayload(row.oldValue),
      newValue: sanitizeAuditPayload(row.newValue),
      maskedIpAddress: maskIpAddress(row.ipAddress),
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      actor: row.user
        ? {
            id: row.user.id,
            name: row.user.name,
            maskedEmail: maskEmail(row.user.email),
            role: row.user.role,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      message: "Daftar audit log berhasil diambil",
      data: {
        logs,
        actionCounts,
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
    reportServerError("Admin audit logs fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil audit log" },
      { status: 500 },
    );
  }
}

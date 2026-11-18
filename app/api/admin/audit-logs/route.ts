import { sanitizeAuditPayload } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { adminAuditLogQuerySchema } from "@/lib/validations/schemas";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Menyamarkan email aktor pada tampilan audit log
function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

// Menyamarkan alamat IP agar tetap informatif secara diagnostik tanpa mengekspos IP penuh
function maskIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  if (trimmed.includes(".")) {
    const octets = trimmed.split(".");
    if (octets.length === 4) {
      return `${octets[0]}.${octets[1]}.*.*`;
    }
  }

  if (trimmed.includes(":")) {
    const groups = trimmed.split(":");
    return `${groups.slice(0, 2).join(":")}:****`;
  }

  return "***";
}

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

    const whereClause: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
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

    const [rows, total] = await Promise.all([
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
    ]);

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

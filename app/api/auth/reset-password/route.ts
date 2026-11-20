import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/auditLog";
import {
  hashPasswordResetToken,
  isRoleEligibleForPasswordReset,
  isValidPasswordResetTokenFormat,
} from "@/lib/password-reset";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/server-error-report";
import { resetPasswordSchema } from "@/lib/validations/schemas";

const INVALID_TOKEN_MESSAGE =
  "Tautan pengaturan ulang kata sandi tidak valid atau sudah kedaluwarsa.";

const INVALID_RESET_TOKEN_ERROR = "INVALID_RESET_TOKEN";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limitCheck = checkRateLimit(
      `reset-password-verify:ip:${clientIp}`,
      20,
      15 * 60_000,
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Terlalu banyak percobaan. Silakan tunggu beberapa menit.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limitCheck.retryAfterSec) },
        },
      );
    }

    const token = new URL(request.url).searchParams.get("token")?.trim() || "";
    if (!isValidPasswordResetTokenFormat(token)) {
      return NextResponse.json(
        {
          success: false,
          message: INVALID_TOKEN_MESSAGE,
        },
        { status: 400 },
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt <= new Date() ||
      !record.user.isActive ||
      !isRoleEligibleForPasswordReset(record.user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: INVALID_TOKEN_MESSAGE,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { valid: true },
      },
      { status: 200 },
    );
  } catch (error) {
    reportServerError("Error verify reset-password token:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memverifikasi tautan pengaturan ulang kata sandi.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limitCheck = checkRateLimit(
      `reset-password:ip:${clientIp}`,
      10,
      15 * 60_000,
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Terlalu banyak percobaan. Silakan tunggu beberapa menit.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limitCheck.retryAfterSec) },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format permintaan tidak valid.",
        },
        { status: 400 },
      );
    }

    const { token, password } = resetPasswordSchema.parse(body);
    const tokenHash = hashPasswordResetToken(token);
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const userId = await prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      if (
        !record ||
        record.usedAt ||
        record.expiresAt <= now ||
        !record.user.isActive ||
        !isRoleEligibleForPasswordReset(record.user.role)
      ) {
        throw new Error(INVALID_RESET_TOKEN_ERROR);
      }

      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        throw new Error(INVALID_RESET_TOKEN_ERROR);
      }

      await tx.user.update({
        where: { id: record.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: now,
        },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          usedAt: null,
        },
      });

      return record.userId;
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      newValue: { event: "PASSWORD_RESET", sessionsInvalidated: true },
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Data pengaturan ulang kata sandi tidak valid.",
          errors: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === INVALID_RESET_TOKEN_ERROR) {
      return NextResponse.json(
        {
          success: false,
          message: INVALID_TOKEN_MESSAGE,
        },
        { status: 400 },
      );
    }

    reportServerError("Error reset-password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui kata sandi. Silakan coba lagi.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_URL, PASSWORD_RESET_TTL_MINUTES } from "@/lib/config/domain";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  PASSWORD_RESET_TTL_MS,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isRoleEligibleForPasswordReset,
} from "@/lib/password-reset";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/server-error-report";
import { forgotPasswordSchema } from "@/lib/validations/schemas";

const GENERIC_FORGOT_MESSAGE =
  "Jika email terdaftar pada akun aktif, tautan pengaturan ulang kata sandi telah dikirim. Periksa kotak masuk atau folder spam Anda.";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipLimit = checkRateLimit(
      `forgot-password:ip:${clientIp}`,
      5,
      15 * 60_000,
    );
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Terlalu banyak permintaan pengaturan ulang kata sandi. Silakan tunggu beberapa menit.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
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

    const { email } = forgotPasswordSchema.parse(body);

    const emailLimit = checkRateLimit(
      `forgot-password:email:${email}`,
      3,
      15 * 60_000,
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Terlalu banyak permintaan untuk email ini. Silakan tunggu beberapa menit.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec) },
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // Jangan bocorkan keberadaan akun maupun peran Admin; non-Admin aktif saja yang diproses.
    if (!user || !user.isActive || !isRoleEligibleForPasswordReset(user.role)) {
      return NextResponse.json(
        {
          success: true,
          message: GENERIC_FORGOT_MESSAGE,
        },
        { status: 200 },
      );
    }

    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    const createdToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      });
      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        select: { id: true },
      });
    });

    const resetUrl = `${APP_URL}/auth/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      });
    } catch (emailError) {
      await prisma.passwordResetToken
        .delete({ where: { id: createdToken.id } })
        .catch(() => {});
      reportServerError("Gagal mengirim email reset password:", emailError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Layanan pengiriman email sedang mengalami gangguan. Silakan coba beberapa saat lagi.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: GENERIC_FORGOT_MESSAGE,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Email tidak valid",
          errors: error.issues,
        },
        { status: 400 },
      );
    }

    reportServerError("Error forgot-password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses permintaan pengaturan ulang kata sandi.",
      },
      { status: 500 },
    );
  }
}

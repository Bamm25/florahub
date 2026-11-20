import { getServerSession, type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authOptions } from "../auth";
import {
  DEFAULT_MAX_AGE_SECONDS,
  decodeRfc7519Jwt,
  isTokenIssuedBeforePasswordChange,
} from "../jwt-rfc7519";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "../prisma";

// Antarmuka struktur data pengguna dalam sesi atau token Bearer RFC 7519
interface SessionUser {
  id?: string;
  sub?: string;
  role?: Role;
  name?: string | null;
  email?: string | null;
}

// Antarmuka hasil verifikasi otentikasi dan otorisasi
interface AuthResult {
  userId: string;
  userRole: Role;
  session: Session;
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

// Fungsi middleware untuk validasi sesi NextAuth atau Bearer JWT RFC 7519 dan izin peran pengguna
export async function requireAuth(
  request: Request,
  allowedRoles?: Role[],
): Promise<AuthResult> {
  let session = await getServerSession(authOptions);
  let activeUser = session?.user as SessionUser | undefined;
  let decodedBearerToken: JWT | null = null;

  // Fallback verifikasi Authorization: Bearer <JWT> standar RFC 7519 untuk API client
  if (!activeUser) {
    const bearerToken = extractBearerToken(request);
    if (bearerToken) {
      const secret = process.env.NEXTAUTH_SECRET || "";
      const decoded: JWT | null = await decodeRfc7519Jwt({
        token: bearerToken,
        secret,
      });

      if (decoded) {
        decodedBearerToken = decoded;
        activeUser = {
          id: typeof decoded.id === "string" ? decoded.id : decoded.sub,
          sub: decoded.sub,
          role: decoded.role as Role | undefined,
          name: decoded.name ?? null,
          email: decoded.email ?? null,
        };
        const expiresAtMs =
          typeof decoded.exp === "number"
            ? decoded.exp * 1000
            : Date.now() + DEFAULT_MAX_AGE_SECONDS * 1000;
        session = {
          user: {
            name: decoded.name ?? undefined,
            email: decoded.email ?? undefined,
          },
          expires: new Date(expiresAtMs).toISOString(),
        };
      }
    }
  }

  if (!session || !activeUser) {
    throw NextResponse.json(
      {
        success: false,
        message: "Tidak terautentikasi: Silakan login terlebih dahulu",
      },
      { status: 401 },
    );
  }

  let userRole = activeUser.role as Role;
  let userId = activeUser.id || activeUser.sub;

  // Verifikasi keberadaan akun pengguna di basis data
  let dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          isActive: true,
          passwordChangedAt: true,
        },
      })
    : null;

  // Fallback pencarian pengguna lewat email jika id tidak ditemukan
  if (!dbUser && activeUser.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: activeUser.email },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        isActive: true,
        passwordChangedAt: true,
      },
    });
  }

  // Validasi keaktifan akun pengguna
  if (!dbUser || !dbUser.isActive) {
    throw NextResponse.json(
      {
        success: false,
        message:
          "Sesi Anda sudah kedaluwarsa atau akun tidak aktif. Silakan login kembali.",
      },
      { status: 401 },
    );
  }

  if (
    decodedBearerToken &&
    isTokenIssuedBeforePasswordChange(decodedBearerToken, dbUser.passwordChangedAt)
  ) {
    throw NextResponse.json(
      {
        success: false,
        message:
          "Sesi Anda sudah kedaluwarsa karena kata sandi telah diubah. Silakan login kembali.",
      },
      { status: 401 },
    );
  }

  userId = dbUser.id;
  userRole = dbUser.role;

  if (session.user) {
    Object.assign(session.user, {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
    });
  }

  // Validasi kecocokan peran pengguna jika batasan peran ditentukan
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      const rolesText = allowedRoles.join(" atau ");
      throw NextResponse.json(
        {
          success: false,
          message: `Forbidden: Endpoint ini khusus untuk ${rolesText.toLowerCase()}`,
        },
        { status: 403 },
      );
    }
  }

  return {
    userId,
    userRole,
    session,
  };
}

import { getServerSession, type Session } from "next-auth";
import { authOptions } from "../auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "../prisma";

// Antarmuka struktur data pengguna dalam sesi
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

// Fungsi middleware untuk validasi sesi otentikasi dan izin peran pengguna
export async function requireAuth(
  request: Request,
  allowedRoles?: Role[],
): Promise<AuthResult> {
  // Ambil data sesi pengguna saat ini
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw NextResponse.json(
      {
        success: false,
        message: "Tidak terautentikasi: Silakan login terlebih dahulu",
      },
      { status: 401 },
    );
  }

  const user = session.user as SessionUser;
  let userRole = user.role as Role;
  let userId = user.id || user.sub;

  // Verifikasi keberadaan akun pengguna di basis data
  let dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true },
      })
    : null;

  // Fallback pencarian pengguna lewat email jika id tidak ditemukan
  if (!dbUser && session.user.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, isActive: true },
    });
  }

  // Validasi keaktifan akun pengguna
  if (!dbUser || !dbUser.isActive) {
    throw NextResponse.json(
      {
        success: false,
        message: "Sesi Anda sudah kedaluwarsa atau akun tidak aktif. Silakan login kembali.",
      },
      { status: 401 },
    );
  }

  userId = dbUser.id;
  userRole = dbUser.role;

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

  // Kembalikan objek hasil otentikasi pengguna
  return {
    userId,
    userRole,
    session,
  };
}

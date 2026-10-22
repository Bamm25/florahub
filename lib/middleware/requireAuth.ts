import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

interface AuthResult {
  userId: string;
  userRole: Role;
  session: any;
}

/**
 * Middleware untuk authentication & authorization
 * @param request - Next.js Request object
 * @param allowedRoles - Array of roles yang diizinkan (optional)
 * @returns { userId, userRole, session }
 * @throws NextResponse dengan 401 jika tidak terautentikasi
 * @throws NextResponse dengan 403 jika role tidak diizinkan
 */

export async function requireAuth(
  request: Request,
  allowedRoles?: Role[],
): Promise<AuthResult> {
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

  const userRole = (session.user as any)?.role as Role;
  const userId = (session.user as any)?.id as string;

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

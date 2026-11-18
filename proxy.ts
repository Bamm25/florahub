import { NextResponse, type NextRequest } from "next/server";
import { decodeRfc7519Jwt } from "@/lib/jwt-rfc7519";

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

function getRoleRequirement(pathname: string): string | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "ADMIN";
  }
  if (pathname === "/florist" || pathname.startsWith("/florist/")) {
    return "FLORIST";
  }
  if (pathname === "/supplier" || pathname.startsWith("/supplier/")) {
    return "SUPPLIER";
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionToken = SESSION_COOKIE_NAMES.map(
    (name) => request.cookies.get(name)?.value,
  ).find(Boolean);

  const decoded = sessionToken
    ? await decodeRfc7519Jwt({
        token: sessionToken,
        secret: process.env.NEXTAUTH_SECRET || "",
      })
    : null;

  const decodedActive =
    decoded &&
    (decoded as { isActive?: unknown }).isActive !== false &&
    typeof decoded.sub === "string" &&
    decoded.sub.length > 0;

  if (!decoded || !decodedActive) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = getRoleRequirement(pathname);
  if (requiredRole && decoded.role !== requiredRole) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/florist/:path*",
    "/supplier/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};

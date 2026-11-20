import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";
import type { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";

export const JWT_ISSUER = "urn:florahub:auth";
export const JWT_AUDIENCE = "urn:florahub:api";
export const DEFAULT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Header JOSE standar sesuai RFC 7519 Section 5 & RFC 7518 Section 3.2
export interface Rfc7519Header {
  alg: "HS256";
  typ: "JWT";
}

// Struktur klaim JWT standar RFC 7519 Section 4.1 (Registered) + Section 4.3 (Private)
export interface Rfc7519Claims extends JWT {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: Role;
  authTime?: number;
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function hasValidSecret(secret: string | Buffer | undefined): secret is string | Buffer {
  if (!secret) return false;
  return typeof secret === "string" ? secret.length > 0 : secret.length > 0;
}

function signHs256(signingInput: string, secret: string | Buffer): Buffer {
  return createHmac("sha256", secret).update(signingInput).digest();
}

/**
 * Mengkodekan dan menandatangani token JWT standar RFC 7519 (JWS HS256 - 3 segmen).
 */
export async function encodeRfc7519Jwt(
  params: JWTEncodeParams,
): Promise<string> {
  if (!params.token) {
    return "";
  }
  if (!hasValidSecret(params.secret)) {
    throw new Error(
      "NEXTAUTH_SECRET wajib diatur untuk menandatangani token JWT RFC 7519",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const maxAge = params.maxAge ?? DEFAULT_MAX_AGE_SECONDS;
  const rawToken = params.token;
  const subject =
    (typeof rawToken.sub === "string" && rawToken.sub.length > 0
      ? rawToken.sub
      : undefined) ??
    (typeof rawToken.id === "string" && rawToken.id.length > 0
      ? rawToken.id
      : undefined) ??
    "";

  const header: Rfc7519Header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: Rfc7519Claims = {
    // Registered Claims (RFC 7519 Section 4.1)
    iss: JWT_ISSUER,
    sub: subject,
    aud: JWT_AUDIENCE,
    iat: now,
    nbf: now,
    exp: now + maxAge,
    jti: randomUUID(),
    // Private Application Claims (RFC 7519 Section 4.3)
    ...(typeof rawToken.id === "string" ? { id: rawToken.id } : {}),
    ...(rawToken.name !== undefined ? { name: rawToken.name } : {}),
    ...(rawToken.email !== undefined ? { email: rawToken.email } : {}),
    ...(typeof rawToken.role === "string" ? { role: rawToken.role as Role } : {}),
    ...(typeof rawToken.authTime === "number" && Number.isFinite(rawToken.authTime)
      ? { authTime: rawToken.authTime }
      : {}),
  };

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureB64 = toBase64Url(signHs256(signingInput, params.secret));

  return `${signingInput}.${signatureB64}`;
}

/**
 * Memverifikasi tanda tangan HMAC-SHA256, header JOSE, dan seluruh Registered Claims RFC 7519.
 */
export async function decodeRfc7519Jwt(
  params: JWTDecodeParams,
): Promise<JWT | null> {
  if (!params.token || !hasValidSecret(params.secret)) {
    return null;
  }

  const parts = params.token.split(".");
  if (parts.length !== 3 || parts.some((segment) => segment.length === 0)) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const headerRaw: unknown = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf8"),
    );
    if (
      !headerRaw ||
      typeof headerRaw !== "object" ||
      Array.isArray(headerRaw)
    ) {
      return null;
    }
    const header = headerRaw as Record<string, unknown>;
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const expectedSignature = signHs256(
      `${headerB64}.${payloadB64}`,
      params.secret,
    );
    const actualSignature = Buffer.from(signatureB64, "base64url");
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const payloadRaw: unknown = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    if (
      !payloadRaw ||
      typeof payloadRaw !== "object" ||
      Array.isArray(payloadRaw)
    ) {
      return null;
    }

    const payload = payloadRaw as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) {
      return null;
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }
    if (typeof payload.jti !== "string" || payload.jti.length === 0) {
      return null;
    }
    if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) {
      return null;
    }
    if (
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      now >= payload.exp
    ) {
      return null;
    }
    if (
      typeof payload.nbf !== "number" ||
      !Number.isFinite(payload.nbf) ||
      now < payload.nbf
    ) {
      return null;
    }

    return payload as JWT;
  } catch {
    return null;
  }
}

/**
 * Menolak token JWT yang diterbitkan sebelum pembaruan kata sandi terakhir.
 */
export function isTokenIssuedBeforePasswordChange(
  token: JWT | { authTime?: unknown; iat?: unknown },
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) {
    return false;
  }
  const claims = token as { authTime?: unknown; iat?: unknown };
  const changedAtMs = passwordChangedAt.getTime();
  if (typeof claims.authTime === "number" && Number.isFinite(claims.authTime)) {
    return claims.authTime < changedAtMs;
  }
  if (typeof claims.iat === "number" && Number.isFinite(claims.iat)) {
    return claims.iat * 1000 < changedAtMs;
  }
  return true;
}

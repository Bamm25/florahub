import { reportServerError } from "@/lib/server-error-report";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";

const SENSITIVE_AUDIT_KEYS = new Set([
  "password",
  "token",
  "secret",
  "accesstoken",
  "refreshtoken",
  "paymenturl",
  "paymentproof",
  "depositproof",
  "finalproof",
  "biteshiplabelurl",
  "email",
  "phone",
  "fulladdress",
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    SENSITIVE_AUDIT_KEYS.has(normalized) ||
    normalized.endsWith("password") ||
    normalized.endsWith("token") ||
    normalized.endsWith("secret")
  );
}

/**
 * Membersihkan payload oldValue / newValue secara rekursif agar kredensial, token,
 * tautan internal, dan PII sensitif tidak pernah tersimpan atau terbaca mentah.
 */
export function sanitizeAuditPayload(
  value: unknown,
): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitized: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, nestedValue] of entries) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeAuditPayload(nestedValue);
      }
    }
    return sanitized as Prisma.InputJsonValue;
  }

  return String(value);
}

// Fungsi untuk mencatat aktivitas log audit pengguna dan entitas ke database tanpa PII/rahasia
export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "PAYMENT"
    | "REFUND";
  entity: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  if (!action || !entity || !entityId) {
    reportServerError("createAuditLog: Missing required fields");
    return;
  }

  const safeOldValue = sanitizeAuditPayload(oldValue);
  const safeNewValue = sanitizeAuditPayload(newValue);

  const normalizedIp = ipAddress
    ? ipAddress.split(",")[0]?.trim().slice(0, 45) || null
    : null;

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId,
        oldValue: safeOldValue ?? Prisma.JsonNull,
        newValue: safeNewValue ?? Prisma.JsonNull,
        ipAddress: normalizedIp,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });
  } catch (error) {
    reportServerError("Failed to create audit log:", error);
  }
}

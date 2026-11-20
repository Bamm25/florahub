import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TTL_MINUTES } from "./config/domain";

export const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000;

export const ALLOWED_PASSWORD_RESET_ROLES: ReadonlySet<string> = new Set([
  "CUSTOMER",
  "FLORIST",
  "SUPPLIER",
]);

/** Hanya akun non-Admin yang diperbolehkan mengatur ulang kata sandi via email. */
export function isRoleEligibleForPasswordReset(
  role: string | null | undefined,
): boolean {
  return Boolean(role && ALLOWED_PASSWORD_RESET_ROLES.has(role));
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidPasswordResetTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

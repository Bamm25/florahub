import { Prisma } from "@prisma/client";
import prisma from "./prisma";

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
    console.error("createAuditLog: Missing required fields", {
      action,
      entity,
      entityId,
    });
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId,
        oldValue: oldValue ?? Prisma.JsonNull,
        newValue: newValue ?? Prisma.JsonNull,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
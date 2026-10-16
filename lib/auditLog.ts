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
  oldValue?: object | null;
  newValue?: object | null;
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
        oldValue: oldValue || null,
        newValue: newValue || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
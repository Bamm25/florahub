import prisma from "@/lib/prisma";

/** Idempotent expiry and reminders; safe to invoke from GET and scheduled jobs. */
export async function autoExpireOverduePreOrders(): Promise<number> {
  const now = new Date();
  const overdue = await prisma.harvestPreOrder.findMany({
    where: { status: "CONFIRMED", depositDeadline: { lte: now } },
    include: { announcement: true, florist: true },
  });
  let expired = 0;
  for (const order of overdue) {
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.harvestPreOrder.updateMany({
        where: { id: order.id, status: "CONFIRMED", depositDeadline: { lte: now } },
        data: { status: "EXPIRED", cancelledAt: now, cancelReason: "Batas pembayaran DP 50% (3 hari) telah terlewati" },
      });
      if (!result.count) return false;
      await tx.notification.createMany({ data: [
        { userId: order.floristId, title: "Pre-Order Kedaluwarsa", message: `DP ${order.announcement.flowerName} tidak dibayar dalam 3 hari.`, type: "PREORDER_CONFIRMED", link: "/florist/harvest-plans" },
        { userId: order.announcement.supplierId, title: "Pre-Order Kedaluwarsa", message: `Pesanan ${order.florist.name} untuk ${order.quantity} tangkai ${order.announcement.flowerName} kedaluwarsa.`, type: "PREORDER_CONFIRMED", link: "/supplier/harvest-announcements" },
      ] });
      return true;
    });
    if (changed) expired++;
  }
  return expired;
}

/** A daily window prevents repeated reminders when cron retries; exact-once requires a unique reminder key in the schema. */
export async function remindPreOrderPayments(): Promise<number> {
  const now = new Date();
  const inDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const candidates = await prisma.harvestPreOrder.findMany({
    where: { OR: [
      { status: "CONFIRMED", depositDeadline: { gt: now, lte: inDay } },
      { status: "DEPOSIT_PAID", finalDeadline: { gt: now, lte: inDay } },
    ] },
    include: { announcement: true },
  });
  let sent = 0;
  for (const order of candidates) {
    const title = order.status === "CONFIRMED" ? `DP segera jatuh tempo #${order.id}` : `Pelunasan segera jatuh tempo #${order.id}`;
    const alreadySent = await prisma.notification.findFirst({ where: { userId: order.floristId, title } });
    if (alreadySent) continue;
    // Recheck status immediately before sending to avoid stale reminders.
    const current = await prisma.harvestPreOrder.findUnique({ where: { id: order.id } });
    if (current?.status !== order.status) continue;
    await prisma.notification.create({ data: {
      userId: order.floristId, title,
      message: `Pembayaran ${order.status === "CONFIRMED" ? "DP" : "pelunasan"} untuk ${order.announcement.flowerName} jatuh tempo dalam 24 jam.`,
      type: "PREORDER_CONFIRMED", link: "/florist/harvest-plans",
    } });
    sent++;
  }
  return sent;
}


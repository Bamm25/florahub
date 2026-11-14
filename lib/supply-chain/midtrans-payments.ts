import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type MidtransPayment = {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
};

export const paymentOrder = (kind: "DP" | "FINAL" | "STOCK", id: string) =>
  `${kind}_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// Panen disimpan pada kalender WIB sebagai 00:00 UTC. Pembayaran akhir
// diperbolehkan sampai pukul 23:59:59 WIB pada tanggal yang sama.
export function harvestDayEndWib(harvestDate: Date): Date {
  return new Date(`${harvestDate.toISOString().slice(0, 10)}T16:59:59.999Z`);
}

// Newly accepted pre-orders store finalDeadline as end-of-harvest-day in WIB.
// Older records stored midnight UTC; normalize them until their data is migrated.
export function finalPaymentDeadline(orderDeadline: Date, harvestDate: Date): Date {
  return orderDeadline.getTime() === harvestDate.getTime()
    ? harvestDayEndWib(harvestDate)
    : orderDeadline;
}

// The client callback is only a hint. Ask Midtrans directly with server credentials.
export async function fetchMidtransPayment(transactionId: string): Promise<MidtransPayment> {
  if (!process.env.MIDTRANS_SERVER_KEY) throw new Error("MIDTRANS_SERVER_KEY missing");
  if (!/^[\w-]{1,100}$/.test(transactionId)) throw new Error("Invalid transaction ID");
  const host = process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "api.midtrans.com" : "api.sandbox.midtrans.com";
  const response = await fetch(`https://${host}/v2/${encodeURIComponent(transactionId)}/status`, {
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64")}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Midtrans status unavailable (${response.status})`);
  const payment = await response.json() as MidtransPayment;
  if (payment.transaction_id !== transactionId && payment.order_id !== transactionId) {
    throw new Error("Midtrans transaction ID mismatch");
  }
  return payment;
}

export function isSettled(payment: MidtransPayment) {
  return payment.transaction_status === "settlement" ||
    (payment.transaction_status === "capture" && payment.fraud_status === "accept");
}

export function matchesPayment(payment: MidtransPayment, kind: "DP" | "FINAL" | "STOCK", id: string, amount: number) {
  const amountNumber = Number(payment.gross_amount);
  return payment.order_id.startsWith(`${kind}_${id}_`) &&
    /^\d+(?:\.\d{1,2})?$/.test(String(payment.gross_amount)) &&
    Number.isSafeInteger(amountNumber) && amountNumber === amount &&
    typeof payment.transaction_id === "string" && payment.transaction_id.length > 0;
}

/** Transition + notification in one transaction. Conditional writes make webhook retries harmless. */
export async function settlePreorder(payment: MidtransPayment, kind: "DP" | "FINAL", id: string) {
  if (!isSettled(payment)) return { changed: false, reason: "Payment not settled" };
  return prisma.$transaction(async (tx) => {
    const order = await tx.harvestPreOrder.findUnique({ where: { id }, include: { announcement: true, florist: true } });
    if (!order) return { changed: false, reason: "Pre-order not found" };
    const amount = kind === "DP" ? order.depositAmount : order.remainingAmount;
    if (!amount || !matchesPayment(payment, kind, id, amount)) return { changed: false, reason: "Payment identity or amount mismatch" };
    if (kind === "DP" && order.depositProof?.startsWith("MIDTRANS:") && order.depositProof !== `MIDTRANS:${payment.transaction_id}`) return { changed: false, reason: "Different DP transaction already recorded; reconcile payment" };
    if (kind === "FINAL" && order.finalProof?.startsWith("MIDTRANS:") && order.finalProof !== `MIDTRANS:${payment.transaction_id}`) return { changed: false, reason: "Different final transaction already recorded; reconcile payment" };
    const now = new Date();
    if (kind === "DP") {
      if (order.status !== "CONFIRMED") {
        return { changed: false, reason: order.depositProof === `MIDTRANS:${payment.transaction_id}` && order.status === "DEPOSIT_PAID" ? "Already processed" : "DP order not eligible; reconcile payment" };
      }
      if (!order.depositDeadline || order.depositDeadline < now) {
        return { changed: false, reason: "DP deadline passed; reconcile payment" };
      }
      // The announcement's estimatedQuantity is TOTAL capacity, never a mutable balance.
      // Serialize DP reservations against other settlements on the same harvest.
      await tx.$queryRaw`SELECT id FROM "HarvestAnnouncement" WHERE id = ${order.announcementId} FOR UPDATE`;
      const active = await tx.harvestPreOrder.aggregate({
        where: { announcementId: order.announcementId, status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "PAID", "SHIPPED", "DELIVERED"] } },
        _sum: { quantity: true },
      });
      if ((active._sum.quantity ?? 0) > order.announcement.estimatedQuantity) {
        return { changed: false, reason: "Harvest capacity exceeded; resolve payment manually" };
      }
      const changed = await tx.harvestPreOrder.updateMany({
        where: { id, status: "CONFIRMED", depositDeadline: { gte: now } },
        data: { status: "DEPOSIT_PAID", depositPaidAt: now, depositProof: `MIDTRANS:${payment.transaction_id}` },
      });
      if (!changed.count) return { changed: false, reason: "Already processed" };
      await tx.notification.createMany({ data: [
        { userId: order.announcement.supplierId, title: "DP Pre-Order Masuk (Midtrans)", message: `DP untuk ${order.quantity} tangkai ${order.announcement.flowerName} dari ${order.florist.name} telah dibayar.`, type: "PREORDER_CONFIRMED", link: "/supplier/harvest-announcements" },
        { userId: order.floristId, title: "DP Pre-Order Diterima", message: `Kuota ${order.quantity} tangkai ${order.announcement.flowerName} telah dikunci. Pelunasan jatuh tempo pada tanggal panen.`, type: "PREORDER_CONFIRMED", link: "/florist/harvest-plans" },
      ] });
    } else {
      if (order.status !== "DEPOSIT_PAID") return { changed: false, reason: order.status === "PAID" && order.finalProof === `MIDTRANS:${payment.transaction_id}` ? "Already processed" : "DP not paid or final state invalid; reconcile payment" };
      if (!order.finalDeadline || now > finalPaymentDeadline(order.finalDeadline, order.announcement.harvestDate)) {
        return { changed: false, reason: "Final payment deadline passed; reconcile payment" };
      }
      const changed = await tx.harvestPreOrder.updateMany({
        where: { id, status: "DEPOSIT_PAID", finalDeadline: { not: null } },
        data: { status: "PAID", finalPaidAt: now, finalProof: `MIDTRANS:${payment.transaction_id}` },
      });
      if (!changed.count) return { changed: false, reason: "Already processed" };
      await tx.notification.createMany({ data: [
        { userId: order.announcement.supplierId, title: "Pelunasan Pre-Order Diterima", message: `Pelunasan ${order.quantity} tangkai ${order.announcement.flowerName} dari ${order.florist.name} berhasil.`, type: "PREORDER_CONFIRMED", link: "/supplier/harvest-announcements" },
        { userId: order.floristId, title: "Pre-Order Lunas", message: `Pelunasan ${order.announcement.flowerName} diterima.`, type: "PAYMENT_SUCCESS", link: "/florist/harvest-plans" },
      ] });
    }
    return { changed: true, reason: "Settled" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function settleStock(payment: MidtransPayment, id: string) {
  if (!isSettled(payment)) return { changed: false, reason: "Payment not settled" };
  return prisma.$transaction(async (tx) => {
    const sale = await tx.stockTransaction.findUnique({ where: { id }, include: { stock: true } });
    if (!sale) return { changed: false, reason: "Sale not found" };
    if (!matchesPayment(payment, "STOCK", id, sale.totalPrice)) return { changed: false, reason: "Payment identity or amount mismatch" };
    if (sale.status !== "PENDING") return { changed: false, reason: ["PAID", "SHIPPED", "DELIVERED"].includes(sale.status) && sale.paymentProof === `MIDTRANS:${payment.transaction_id}` ? "Already processed" : "Sale not eligible; reconcile payment" };
    const reserved = await tx.stock.updateMany({ where: { id: sale.stockId, quantity: { gte: sale.quantity }, isAvailable: true }, data: { quantity: { decrement: sale.quantity } } });
    if (!reserved.count) return { changed: false, reason: "Insufficient stock; resolve payment manually" };
    const changed = await tx.stockTransaction.updateMany({ where: { id, status: "PENDING" }, data: { status: "PAID", paymentProof: `MIDTRANS:${payment.transaction_id}` } });
    if (!changed.count) throw new Error("Concurrent sale transition; rollback reservation");
    await tx.notification.createMany({ data: [
      { userId: sale.stock.supplierId, title: "Penjualan Stok Dibayar", message: `Pembayaran ${sale.quantity} tangkai ${sale.stock.name} diterima melalui Midtrans.`, type: "PAYMENT_SUCCESS", link: "/supplier/sales" },
      { userId: sale.floristId, title: "Pembayaran Stok Berhasil", message: `Pembayaran ${sale.quantity} tangkai ${sale.stock.name} berhasil.`, type: "PAYMENT_SUCCESS", link: "/florist/supplier-stocks" },
    ] });
    return { changed: true, reason: "Settled" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

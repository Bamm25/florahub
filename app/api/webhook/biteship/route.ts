import { reportServerError } from "@/lib/server-error-report";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import { fulfillPreOrderToInventory, fulfillSaleToInventory } from "@/lib/supply-chain/fulfill-inventory";

// Configure these custom headers in the Biteship dashboard and server env.
export async function POST(req: NextRequest) {
  const key = process.env.BITESHIP_WEBHOOK_SIGNATURE_KEY;
  const secret = process.env.BITESHIP_WEBHOOK_SIGNATURE_SECRET;
  if (!key || !secret || !/^[a-z0-9-]+$/i.test(key)) return NextResponse.json({ success: false, message: "Webhook not configured" }, { status: 503 });
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(req.headers.get(key) || "");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!["order.status", "order.waybill_id", "order.price"].includes(body?.event)) return NextResponse.json({ success: true, message: "Event ignored" });
    if (typeof body.order_id !== "string" || !body.order_id) return NextResponse.json({ success: false, message: "Missing order ID" }, { status: 400 });
    const id = body.order_id;
    const shipment = await prisma.shipment.findFirst({ where: { biteshipOrderId: id }, include: { order: true } });
    const preOrder = await prisma.harvestPreOrder.findFirst({ where: { biteshipOrderId: id } });
    const sale = await prisma.stockTransaction.findFirst({ where: { biteshipOrderId: id } });
    if (!shipment && !preOrder && !sale) return NextResponse.json({ success: true, message: "Unknown order ignored" });
    // Never trust status or waybill supplied by the callback; read the actual order.
    const remote = await getBiteshipClient().getOrder(id);
    if (remote.id !== id && remote.order_id !== id) throw new Error("Biteship order mismatch");
    const status = mapBiteshipStatus(remote.status);
    const waybill = remote.courier?.waybill_id || undefined;
    const now = new Date();
    if (preOrder && !["DELIVERED", "CANCELLED"].includes(preOrder.status)) {
      if (status === "DELIVERED") await fulfillPreOrderToInventory(preOrder.id);
      else if (status === "SHIPPED") await prisma.harvestPreOrder.updateMany({ where: { id: preOrder.id, status: "PAID" }, data: { status: "SHIPPED", shippedAt: preOrder.shippedAt || now } });
    }
    if (preOrder && waybill) await prisma.harvestPreOrder.updateMany({ where: { id: preOrder.id, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, data: { trackingNumber: waybill } });
    if (sale && !["DELIVERED", "CANCELLED"].includes(sale.status)) {
      if (status === "DELIVERED") await fulfillSaleToInventory(sale.id);
      else if (status === "SHIPPED") await prisma.stockTransaction.updateMany({ where: { id: sale.id, status: "PAID" }, data: { status: "SHIPPED", shippedAt: sale.shippedAt || now } });
    }
    if (sale && waybill) await prisma.stockTransaction.updateMany({ where: { id: sale.id, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, data: { trackingNumber: waybill } });
    if (shipment && !["DELIVERED", "CANCELLED"].includes(shipment.status)) {
      if (["SHIPPED", "DELIVERED"].includes(status)) {
        await prisma.shipment.updateMany({ where: { id: shipment.id, status: { notIn: ["DELIVERED", "CANCELLED"] } }, data: { status, trackingNumber: waybill || shipment.trackingNumber, shippedAt: status === "SHIPPED" ? shipment.shippedAt || now : undefined, deliveredAt: status === "DELIVERED" ? shipment.deliveredAt || now : undefined } });
        const moved = await prisma.order.updateMany({ where: { id: shipment.orderId, status: { in: status === "DELIVERED" ? ["PROCESSING", "SHIPPED"] : ["PROCESSING"] } }, data: { status } });
        if (moved.count) await prisma.notification.create({ data: { userId: shipment.order.userId, type: "SHIPMENT_UPDATE", title: status === "DELIVERED" ? "Pesanan Telah Sampai" : "Pesanan Dalam Pengiriman", message: `Pesanan #${shipment.order.orderNumber} ${status === "DELIVERED" ? "telah diterima" : "sedang dikirim"}.` } });
      } else if (waybill) await prisma.shipment.update({ where: { id: shipment.id }, data: { trackingNumber: waybill } });
    }
    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    reportServerError("[BITESHIP_WEBHOOK_ERROR]", error);
    return NextResponse.json({ success: false, message: "Webhook processing failed" }, { status: 500 });
  }
}

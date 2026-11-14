import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { fetchMidtransPayment, isSettled, settlePreorder } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;
    const order = await prisma.harvestPreOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ success: false, message: "Pre-order tidak ditemukan" }, { status: 404 });
    if (order.floristId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (typeof body.transactionId !== "string") return NextResponse.json({ success: false, message: "transactionId wajib diisi" }, { status: 400 });
    const payment = await fetchMidtransPayment(body.transactionId);
    if (payment.transaction_id !== body.transactionId) return NextResponse.json({ success: false, message: "Midtrans transaction ID mismatch" }, { status: 409 });
    const result = await settlePreorder(payment, "DP", id);
    const current = await prisma.harvestPreOrder.findUnique({ where: { id }, include: { announcement: true, florist: true } });
    if (!result.changed && (result.reason !== "Already processed" || !isSettled(payment) || current?.status !== "DEPOSIT_PAID" || !payment.transaction_id || current.depositProof !== `MIDTRANS:${payment.transaction_id}` || !payment.order_id.startsWith(`DP_${id}_`))) return NextResponse.json({ success: false, message: result.reason }, { status: 409 });
    return NextResponse.json({ success: true, data: { preOrder: current } });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    reportServerError("Midtrans payment verification failed", error);
    return NextResponse.json({ success: false, message: "Tidak dapat memverifikasi pembayaran Midtrans" }, { status: 502 });
  }
}

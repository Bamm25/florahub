import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { fetchMidtransPayment, isSettled, settleStock } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    const sale = await prisma.stockTransaction.findUnique({
      where: { id },
      include: { stock: true, florist: true },
    });
    if (!sale) {
      return NextResponse.json({ success: false, message: "Pembelian tidak ditemukan" }, { status: 404 });
    }
    if (userRole !== "ADMIN" && sale.floristId !== userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (["PAID", "SHIPPED", "DELIVERED"].includes(sale.status)) {
      return NextResponse.json({ success: true, data: { transaction: sale }, message: "Sudah lunas" });
    }

    const body = await request.json().catch(() => ({}));
    const queryId =
      (typeof body.transactionId === "string" && body.transactionId.trim()) ||
      (typeof body.orderId === "string" && body.orderId.trim()) ||
      (sale.paymentProof?.startsWith("MIDTRANS_ORDER:")
        ? sale.paymentProof.replace("MIDTRANS_ORDER:", "").trim()
        : null);

    if (!queryId) {
      return NextResponse.json(
        { success: false, message: "ID transaksi atau order Midtrans wajib disertakan untuk verifikasi" },
        { status: 400 },
      );
    }

    const payment = await fetchMidtransPayment(queryId);
    const result = await settleStock(payment, id);

    const current = await prisma.stockTransaction.findUnique({
      where: { id },
      include: { stock: true, florist: true },
    });

    if (
      !result.changed &&
      (result.reason !== "Already processed" ||
        !isSettled(payment) ||
        current?.status !== "PAID")
    ) {
      return NextResponse.json({ success: false, message: result.reason }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil diverifikasi",
      data: { transaction: current },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Midtrans stock payment confirmation failed", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Tidak dapat memverifikasi pembayaran Midtrans",
      },
      { status: 502 },
    );
  }
}

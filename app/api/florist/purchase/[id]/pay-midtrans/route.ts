import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import prisma from "@/lib/prisma";
import { paymentOrder } from "@/lib/supply-chain/midtrans-payments";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const { id } = await params;
    const sale = await prisma.stockTransaction.findUnique({ where: { id }, include: { stock: true, florist: true } });
    if (!sale) return NextResponse.json({ success: false, message: "Pembelian tidak ditemukan" }, { status: 404 });
    if (sale.floristId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    if (sale.status !== "PENDING") return NextResponse.json({ success: false, message: "Pembelian sudah diproses" }, { status: 409 });
    if (!sale.stock.isAvailable || sale.stock.quantity < sale.quantity) return NextResponse.json({ success: false, message: "Stok tidak mencukupi" }, { status: 409 });
    if (!process.env.MIDTRANS_SERVER_KEY) return NextResponse.json({ success: false, message: "Midtrans belum dikonfigurasi" }, { status: 503 });
    const orderId = paymentOrder("STOCK", id);
    if (orderId.length > 50) throw new Error("Midtrans order ID exceeds 50 characters");
    const transaction = await snap.createTransaction({
      transaction_details: { order_id: orderId, gross_amount: sale.totalPrice },
      item_details: [{ id: sale.stockId, price: sale.pricePerUnit, quantity: sale.quantity, name: sale.stock.name.slice(0, 50) }],
      customer_details: { first_name: sale.florist.name, email: sale.florist.email },
    });
    // Simpan orderId di paymentProof agar bisa disinkronkan statusnya kapan saja
    await prisma.stockTransaction.update({
      where: { id },
      data: { paymentProof: `MIDTRANS_ORDER:${orderId}` },
    });
    return NextResponse.json({ success: true, data: { snapToken: transaction.token, redirectUrl: transaction.redirect_url, orderId } });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    reportServerError("Midtrans direct stock payment error", error);
    return NextResponse.json({ success: false, message: "Gagal membuat transaksi Midtrans" }, { status: 502 });
  }
}

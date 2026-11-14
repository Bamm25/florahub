import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import { paymentOrder, finalPaymentDeadline } from "@/lib/supply-chain/midtrans-payments";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP POST untuk membuat token transaksi Midtrans Snap untuk pelunasan saat panen
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id: preOrderId } = await params;

    if (!process.env.MIDTRANS_SERVER_KEY) return NextResponse.json({ success: false, message: "Midtrans belum dikonfigurasi" }, { status: 503 });
    const preOrder = await prisma.harvestPreOrder.findUnique({
      where: { id: preOrderId },
      include: {
        announcement: {
          select: {
            id: true,
            flowerName: true,
            harvestDate: true,
            supplierId: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!preOrder) {
      return NextResponse.json(
        { success: false, message: "Pre-order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (preOrder.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Pre-order ini bukan milik Anda" },
        { status: 403 },
      );
    }

    if (preOrder.status !== "DEPOSIT_PAID") {
      return NextResponse.json(
        {
          success: false,
          message: `Pelunasan hanya dapat diproses saat status DEPOSIT_PAID. Status saat ini: ${preOrder.status}`,
        },
        { status: 400 },
      );
    }

    const remainingAmount = preOrder.remainingAmount;
    if (!remainingAmount || remainingAmount <= 0) return NextResponse.json({ success: false, message: "Pelunasan belum dihitung" }, { status: 409 });
    if (!preOrder.finalDeadline || new Date() > finalPaymentDeadline(preOrder.finalDeadline, preOrder.announcement.harvestDate)) {
      return NextResponse.json({ success: false, message: "Batas pelunasan pada hari panen telah terlewati; hubungi supplier untuk rekonsiliasi DP." }, { status: 409 });
    }

    // Buat order_id unik untuk transaksi pelunasan Midtrans (maksimal 50 karakter)
    const midtransOrderId = paymentOrder("FINAL", preOrder.id);

    if (midtransOrderId.length > 50) throw new Error("Midtrans order ID too long");
    // Buat transaksi Midtrans Snap
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: remainingAmount,
      },
      item_details: [
        {
          id: `FINAL-${preOrder.id}`,
          price: remainingAmount,
          quantity: 1,
          name: `Pelunasan ${preOrder.announcement.flowerName}`.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: preOrder.florist.name || "Florist Mitra",
        email: preOrder.florist.email || "florist@shop.com",
        phone: preOrder.florist.phone || "",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Token pelunasan Midtrans berhasil dibuat",
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        remainingAmount,
        orderId: midtransOrderId,
      },
    });
  } catch (error) {
    reportServerError("Error creating Midtrans final transaction:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat transaksi pelunasan Midtrans",
      },
      { status: 500 },
    );
  }
}

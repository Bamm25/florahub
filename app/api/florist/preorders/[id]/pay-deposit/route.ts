import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import { paymentOrder } from "@/lib/supply-chain/midtrans-payments";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP POST untuk membuat token transaksi Midtrans Snap untuk pembayaran DP 50%
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

    if (preOrder.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          success: false,
          message: `Pembayaran DP hanya dapat diproses saat status CONFIRMED. Status saat ini: ${preOrder.status}`,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    if (!preOrder.depositDeadline || now >= preOrder.depositDeadline) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Batas waktu pembayaran DP (3 hari) telah berakhir. Pre-order kedaluwarsa.",
        },
        { status: 400 },
      );
    }

    const depositAmount = preOrder.depositAmount;
    if (!depositAmount || depositAmount <= 0) return NextResponse.json({ success: false, message: "DP belum dihitung" }, { status: 409 });

    // Buat order_id unik untuk transaksi DP Midtrans (maksimal 50 karakter)
    const midtransOrderId = paymentOrder("DP", preOrder.id);

    if (midtransOrderId.length > 50) throw new Error("Midtrans order ID too long");
    // Buat transaksi Midtrans Snap
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: depositAmount,
      },
      item_details: [
        {
          id: `DP-${preOrder.id}`,
          price: depositAmount,
          quantity: 1,
          name: `DP 50% ${preOrder.announcement.flowerName}`.slice(0, 50),
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
      message: "Token pembayaran DP berhasil dibuat",
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        depositAmount,
        orderId: midtransOrderId,
      },
    });
  } catch (error) {
    reportServerError("Error creating Midtrans DP transaction:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat transaksi Midtrans DP",
      },
      { status: 500 },
    );
  }
}

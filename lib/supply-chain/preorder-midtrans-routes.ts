import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { snap } from "@/lib/midtrans";
import prisma from "@/lib/prisma";
import { PREORDER_DEPOSIT_DEADLINE_DAYS } from "@/lib/config/domain";
import {
  fetchMidtransPayment,
  finalPaymentDeadline,
  isSettled,
  paymentOrder,
  settlePreorder,
} from "./midtrans-payments";
import { NextResponse } from "next/server";

type PreOrderPaymentKind = "DP" | "FINAL";

const SAFE_FLORIST_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
} as const;

export async function createPreOrderSnapPayment(
  request: Request,
  preOrderId: string,
  kind: PreOrderPaymentKind,
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json(
        { success: false, message: "Midtrans belum dikonfigurasi" },
        { status: 503 },
      );
    }

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
          select: SAFE_FLORIST_SELECT,
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
        {
          success: false,
          message: "Forbidden: Pre-order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    const now = new Date();
    let amount: number | null = null;

    if (kind === "DP") {
      if (preOrder.status !== "CONFIRMED") {
        return NextResponse.json(
          {
            success: false,
            message: `Pembayaran DP hanya dapat diproses saat status CONFIRMED. Status saat ini: ${preOrder.status}`,
          },
          { status: 400 },
        );
      }

      if (!preOrder.depositDeadline || now >= preOrder.depositDeadline) {
        return NextResponse.json(
          {
            success: false,
            message: `Batas waktu pembayaran DP (${PREORDER_DEPOSIT_DEADLINE_DAYS} hari) telah berakhir. Pre-order kedaluwarsa.`,
          },
          { status: 400 },
        );
      }

      amount = preOrder.depositAmount;
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "DP belum dihitung" },
          { status: 409 },
        );
      }
    } else {
      if (preOrder.status !== "DEPOSIT_PAID") {
        return NextResponse.json(
          {
            success: false,
            message: `Pelunasan hanya dapat diproses saat status DEPOSIT_PAID. Status saat ini: ${preOrder.status}`,
          },
          { status: 400 },
        );
      }

      amount = preOrder.remainingAmount;
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "Pelunasan belum dihitung" },
          { status: 409 },
        );
      }

      if (
        !preOrder.finalDeadline ||
        now >
          finalPaymentDeadline(
            preOrder.finalDeadline,
            preOrder.announcement.harvestDate,
          )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Batas pelunasan pada hari panen telah terlewati; hubungi supplier untuk rekonsiliasi DP.",
          },
          { status: 409 },
        );
      }
    }

    const midtransOrderId = paymentOrder(kind, preOrder.id);
    if (midtransOrderId.length > 50) {
      throw new Error("Midtrans order ID too long");
    }

    const itemNamePrefix = kind === "DP" ? "DP Pre-Order" : "Pelunasan";
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: `${kind}-${preOrder.id}`,
          price: amount,
          quantity: 1,
          name: `${itemNamePrefix} ${preOrder.announcement.flowerName}`.slice(
            0,
            50,
          ),
        },
      ],
      customer_details: {
        first_name: preOrder.florist.name || "Florist Mitra",
        email: preOrder.florist.email || "",
        phone: preOrder.florist.phone || "",
      },
    });

    const dataPayload =
      kind === "DP"
        ? {
            snapToken: transaction.token,
            redirectUrl: transaction.redirect_url,
            depositAmount: amount,
            orderId: midtransOrderId,
          }
        : {
            snapToken: transaction.token,
            redirectUrl: transaction.redirect_url,
            remainingAmount: amount,
            orderId: midtransOrderId,
          };

    return NextResponse.json({
      success: true,
      message:
        kind === "DP"
          ? "Token pembayaran DP berhasil dibuat"
          : "Token pelunasan Midtrans berhasil dibuat",
      data: dataPayload,
    });
  } catch (error) {
    reportServerError(`Error creating Midtrans ${kind} transaction:`, error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          kind === "DP"
            ? "Gagal membuat transaksi Midtrans DP"
            : "Gagal membuat transaksi pelunasan Midtrans",
      },
      { status: 500 },
    );
  }
}

export async function confirmPreOrderMidtransPayment(
  request: Request,
  preOrderId: string,
  kind: PreOrderPaymentKind,
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const order = await prisma.harvestPreOrder.findUnique({
      where: { id: preOrderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Pre-order tidak ditemukan" },
        { status: 404 },
      );
    }
    if (order.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.transactionId !== "string" || !body.transactionId.trim()) {
      return NextResponse.json(
        { success: false, message: "transactionId wajib diisi" },
        { status: 400 },
      );
    }

    const payment = await fetchMidtransPayment(body.transactionId);
    if (payment.transaction_id !== body.transactionId) {
      return NextResponse.json(
        { success: false, message: "Midtrans transaction ID mismatch" },
        { status: 409 },
      );
    }

    const result = await settlePreorder(payment, kind, preOrderId);
    const current = await prisma.harvestPreOrder.findUnique({
      where: { id: preOrderId },
      include: {
        announcement: true,
        florist: { select: SAFE_FLORIST_SELECT },
      },
    });

    const expectedStatus = kind === "DP" ? "DEPOSIT_PAID" : "PAID";
    const recordedProof =
      kind === "DP" ? current?.depositProof : current?.finalProof;

    if (
      !result.changed &&
      (result.reason !== "Already processed" ||
        !isSettled(payment) ||
        current?.status !== expectedStatus ||
        !payment.transaction_id ||
        recordedProof !== `MIDTRANS:${payment.transaction_id}` ||
        !payment.order_id.startsWith(`${kind}_${preOrderId}_`))
    ) {
      return NextResponse.json(
        { success: false, message: result.reason },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, data: { preOrder: current } });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    reportServerError("Midtrans payment verification failed", error);
    return NextResponse.json(
      {
        success: false,
        message: "Tidak dapat memverifikasi pembayaran Midtrans",
      },
      { status: 502 },
    );
  }
}

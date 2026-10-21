import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "FLORIST") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya florist yang dapat mengupload bukti bayar",
        },
        { status: 403 },
      );
    }
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            name: true,
            supplier: {
              // notifikasi
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (transaction.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi Anda",
        },
        { status: 403 },
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat mengupload bukti bayar: status transaksi saat ini "${transaction.status}"`,
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { paymentProof } = body;

    if (
      !paymentProof ||
      typeof paymentProof !== "string" ||
      paymentProof.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "URL bukti bayar wajib diisi",
        },
        { status: 400 },
      );
    }

    const updatedTransaction = await prisma.stockTransaction.update({
      where: { id },
      data: {
        paymentProof: paymentProof.trim(),
      },
      include: {
        stock: {
          select: {
            name: true,
            variety: true,
          },
        },
      },
    });
    return NextResponse.json({
      success: true,
      message:
        "Bukti pembayaran berhasil diupload, menunggu konfirmasi supplier",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error upload bukti bayar:", error);
    return NextResponse.json(
      { success: false, message: "Gagal upload bukti bayar" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "FLORIST") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Hanya florist yang dapat melihat detail pembelian",
        },
        { status: 403 },
      );
    }
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stock: {
          select: {
            id: true,
            name: true,
            variety: true,
            unit: true,
            pricePerUnit: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (transaction.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Ini bukan transaksi Anda",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail transaksi berhasil diambil",
      data: { transaction },
    });
  } catch (error) {
    console.error("Error mengambil detail transaksi:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail transaksi" },
      { status: 500 },
    );
  }
}

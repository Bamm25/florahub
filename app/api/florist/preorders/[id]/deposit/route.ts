import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json({ success: false, message: "Pembayaran DP hanya melalui Midtrans." }, { status: 410 });
}

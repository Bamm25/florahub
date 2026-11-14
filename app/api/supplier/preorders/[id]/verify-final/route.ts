import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ success: false, message: "Pembayaran hanya dapat dikonfirmasi oleh Midtrans." }, { status: 410 });
}

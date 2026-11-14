import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json({ success: false, message: "Pelunasan hanya melalui Midtrans." }, { status: 410 });
}

import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ success: false, message: "Pengiriman manual dinonaktifkan. Gunakan menu Pengiriman Biteship." }, { status: 410 });
}

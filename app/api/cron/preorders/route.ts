import { autoExpireOverduePreOrders, remindPreOrderPayments } from "@/lib/supply-chain/expire-preorders";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  try {
    const expired = await autoExpireOverduePreOrders();
    const reminded = await remindPreOrderPayments();
    return NextResponse.json({ success: true, expired, reminded });
  } catch (error) {
    console.error("Pre-order cron failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

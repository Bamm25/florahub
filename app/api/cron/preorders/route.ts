import { timingSafeEqual } from "node:crypto";
import { reportServerError } from "@/lib/server-error-report";
import {
  autoExpireOverduePreOrders,
  remindPreOrderPayments,
} from "@/lib/supply-chain/expire-preorders";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  if (!secret) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const supplied = Buffer.from(authHeader, "utf8");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const expired = await autoExpireOverduePreOrders();
    const reminded = await remindPreOrderPayments();
    return NextResponse.json({ success: true, expired, reminded });
  } catch (error) {
    reportServerError("Pre-order cron failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import {
  calculateB2CShippingQuotes,
  ShippingQuoteError,
} from "@/lib/shipping-rates";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk menghitung perkiraan tarif pengiriman dari florist ke alamat pelanggan
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const { addressId, items } = body;

    if (
      typeof addressId !== "string" ||
      !addressId.trim() ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "addressId dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    const quote = await calculateB2CShippingQuotes({
      userId,
      addressId: addressId.trim(),
      items,
    });

    return NextResponse.json({
      success: true,
      message:
        quote.source === "fallback"
          ? "Shipping rate dihitung (fallback flat rate)"
          : "Shipping rates berhasil dihitung",
      data: {
        rates: quote.rates,
        cheapest: quote.cheapest,
        origin: quote.origin,
        destination: quote.destination,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status },
      );
    }
    reportServerError("[CALCULATE_SHIPPING_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menghitung tarif pengiriman",
      },
      { status: 500 },
    );
  }
}

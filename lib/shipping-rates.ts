import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import {
  ALLOW_FALLBACK_SHIPPING,
  BITESHIP_BASE_URL,
  BITESHIP_TIMEOUT_MS,
  DEFAULT_PRODUCT_WEIGHT_GRAMS,
  FALLBACK_SHIPPING_COST,
  SUPPORTED_COURIERS,
} from "@/lib/config/domain";

export interface ShippingQuoteItemInput {
  productId: string;
  quantity: number;
}

export interface ShippingRateQuote {
  courier: string;
  service: string;
  price: number;
  estimatedDays: string;
}

export interface ShippingQuotesResult {
  rates: ShippingRateQuote[];
  cheapest: ShippingRateQuote;
  origin: { city: string; province: string };
  destination: { city: string; province: string };
  source: "biteship" | "fallback";
}

export class ShippingQuoteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildFallbackQuote(
  origin: { city: string; province: string },
  destination: { city: string; province: string },
): ShippingQuotesResult {
  const fallbackRate: ShippingRateQuote = {
    courier: "default",
    service: "Regular",
    price: FALLBACK_SHIPPING_COST,
    estimatedDays: "2-3 hari",
  };
  return {
    rates: [fallbackRate],
    cheapest: fallbackRate,
    origin,
    destination,
    source: "fallback",
  };
}

export async function calculateB2CShippingQuotes(params: {
  userId: string;
  addressId: string;
  items: ShippingQuoteItemInput[];
}): Promise<ShippingQuotesResult> {
  const customerAddress = await prisma.address.findUnique({
    where: { id: params.addressId },
  });

  if (!customerAddress || customerAddress.userId !== params.userId) {
    throw new ShippingQuoteError(
      403,
      "Alamat tidak ditemukan atau bukan milik Anda",
    );
  }

  const productIds = [...new Set(params.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      floristId: true,
      weight: true,
      price: true,
      name: true,
      isActive: true,
    },
  });

  if (products.length !== productIds.length) {
    throw new ShippingQuoteError(404, "Sebagian produk tidak ditemukan");
  }

  const floristIds = new Set<string>();
  let totalWeight = 0;
  let totalValue = 0;
  const productNames: string[] = [];

  for (const item of params.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.isActive) {
      throw new ShippingQuoteError(
        400,
        `Produk "${product?.name || item.productId}" tidak tersedia`,
      );
    }

    floristIds.add(product.floristId);
    const qty = Math.max(1, Math.trunc(item.quantity));
    const unitWeight = product.weight || DEFAULT_PRODUCT_WEIGHT_GRAMS;
    totalWeight += unitWeight * qty;
    totalValue += product.price * qty;
    productNames.push(product.name);
  }

  if (floristIds.size !== 1) {
    throw new ShippingQuoteError(
      400,
      "Setiap transaksi checkout hanya dapat memuat produk dari satu toko florist",
    );
  }

  const [floristId] = Array.from(floristIds);
  const floristProfile = await prisma.floristProfile.findUnique({
    where: { userId: floristId },
    include: { defaultAddress: true },
  });

  const originAddress =
    floristProfile?.defaultAddress ??
    (await prisma.address.findFirst({
      where: { userId: floristId, isDefault: true },
    }));

  if (!originAddress) {
    throw new ShippingQuoteError(400, "Alamat pickup florist belum diatur");
  }

  const originSummary = {
    city: originAddress.city,
    province: originAddress.province,
  };
  const destinationSummary = {
    city: customerAddress.city,
    province: customerAddress.province,
  };

  const biteshipApiKey = process.env.BITESHIP_API_KEY;
  if (!biteshipApiKey) {
    if (ALLOW_FALLBACK_SHIPPING) {
      return buildFallbackQuote(originSummary, destinationSummary);
    }
    throw new ShippingQuoteError(
      503,
      "Layanan kalkulasi ongkos kirim belum dikonfigurasi",
    );
  }

  const originPostal = Number.parseInt(originAddress.postalCode, 10);
  const destPostal = Number.parseInt(customerAddress.postalCode, 10);
  if (!Number.isFinite(originPostal) || !Number.isFinite(destPostal)) {
    throw new ShippingQuoteError(
      400,
      "Kode pos alamat asal atau tujuan tidak valid",
    );
  }

  const biteshipPayload = {
    origin_postal_code: originPostal,
    destination_postal_code: destPostal,
    couriers: SUPPORTED_COURIERS,
    items: [
      {
        name: `Produk bunga (${productNames.length} item)`,
        description: productNames.join(", ").slice(0, 200),
        value: Math.max(1000, totalValue),
        weight: Math.max(DEFAULT_PRODUCT_WEIGHT_GRAMS, totalWeight),
        quantity: 1,
      },
    ],
  };

  try {
    const biteshipResponse = await fetch(
      `${BITESHIP_BASE_URL}/rates/couriers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: biteshipApiKey,
        },
        body: JSON.stringify(biteshipPayload),
        signal: AbortSignal.timeout(BITESHIP_TIMEOUT_MS),
      },
    );

    if (!biteshipResponse.ok) {
      await biteshipResponse.text();
      reportServerError("[BITESHIP_RATES_ERROR]");
      if (ALLOW_FALLBACK_SHIPPING) {
        return buildFallbackQuote(originSummary, destinationSummary);
      }
      throw new ShippingQuoteError(
        503,
        "Layanan kurir pengiriman sedang tidak tersedia",
      );
    }

    const biteshipData = (await biteshipResponse.json()) as {
      pricing?: Array<{
        available_for_cash_on_delivery: boolean;
        available_for_instant_waybill_id: boolean;
        courier_name: string;
        courier_service_name: string;
        price: number;
        duration: string;
      }>;
    };

    const rates: ShippingRateQuote[] = (biteshipData.pricing || [])
      .filter(
        (rate) =>
          rate.available_for_cash_on_delivery === false &&
          rate.available_for_instant_waybill_id === true,
      )
      .map((rate) => ({
        courier: rate.courier_name.toUpperCase(),
        service: rate.courier_service_name,
        price: Math.round(rate.price),
        estimatedDays: rate.duration,
      }))
      .sort((a, b) => a.price - b.price);

    if (rates.length === 0) {
      if (ALLOW_FALLBACK_SHIPPING) {
        return buildFallbackQuote(originSummary, destinationSummary);
      }
      throw new ShippingQuoteError(
        400,
        "Tidak ada kurir yang mendukung rute pengiriman ini",
      );
    }

    return {
      rates,
      cheapest: rates[0],
      origin: originSummary,
      destination: destinationSummary,
      source: "biteship",
    };
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      throw error;
    }
    reportServerError("[BITESHIP_RATES_FETCH_ERROR]", error);
    if (ALLOW_FALLBACK_SHIPPING) {
      return buildFallbackQuote(originSummary, destinationSummary);
    }
    throw new ShippingQuoteError(
      503,
      "Gagal menghubungi layanan kalkulasi ongkos kirim",
    );
  }
}

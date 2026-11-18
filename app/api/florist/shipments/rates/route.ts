import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import {
  DEFAULT_PRODUCT_WEIGHT_GRAMS,
  SUPPORTED_COURIER_LIST,
} from "@/lib/config/domain";
import prisma from "@/lib/prisma";
import { getFloristPickupAddress } from "@/lib/florist-pickup-address";
import { getBiteshipClient } from "@/lib/biteship";
import type { BiteshipRateItem } from "@/lib/biteship";
import { NextRequest, NextResponse } from "next/server";

// Handler HTTP POST untuk mengecek tarif ongkos kirim pesanan melalui Biteship
export async function POST(req: NextRequest) {
  try {
    const { userId, userRole } = await requireAuth(req, ["FLORIST", "ADMIN"]);

    const body = await req.json();
    const { orderId, couriers } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId wajib diisi" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        user: {
          select: {
            id: true,
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                weight: true,
                floristId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    const ownedItem = order.items.find(
      (item) => item.product?.floristId === userId,
    );
    if (userRole !== "ADMIN" && !ownedItem) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke order ini" },
        { status: 403 },
      );
    }

    const targetFloristId =
      ownedItem?.product?.floristId ?? order.items[0]?.product?.floristId;
    if (!targetFloristId) {
      return NextResponse.json(
        { success: false, message: "Data florist tidak ditemukan" },
        { status: 400 },
      );
    }

    const floristAddress = await getFloristPickupAddress(targetFloristId);
    if (!floristAddress || !floristAddress.postalCode) {
      return NextResponse.json(
        { success: false, message: "Florist belum melengkapi data kode pos" },
        { status: 400 },
      );
    }

    const customerAddress = order.address || order.user.addresses[0];
    if (!customerAddress) {
      return NextResponse.json(
        { success: false, message: "Alamat tujuan pelanggan belum tersedia" },
        { status: 400 },
      );
    }

    const items: BiteshipRateItem[] = order.items.map((item) => ({
      name: item.product?.name || "Produk Florist",
      value: Math.round(item.price),
      quantity: item.quantity,
      height: 10,
      length: 15,
      width: 10,
      weight:
        (item.product?.weight || DEFAULT_PRODUCT_WEIGHT_GRAMS) * item.quantity,
    }));

    const biteshipClient = getBiteshipClient();
    const rates = await biteshipClient.getRates(
      Number.parseInt(floristAddress.postalCode, 10),
      Number.parseInt(customerAddress.postalCode, 10),
      items,
      couriers || SUPPORTED_COURIER_LIST,
    );

    const formattedRates = rates.pricing.map((rate, idx) => ({
      rate_id: `${rate.courier_code}-${rate.courier_service_code}-${idx}`,
      rate_name: rate.courier_service_name,
      courier: {
        code: rate.courier_code,
        name: rate.courier_name,
        service_name: rate.courier_service_name,
        service_code: rate.courier_service_code,
      },
      price: rate.price,
      duration: rate.duration,
      description: rate.description,
      availableCOD: rate.available_for_cash_on_delivery,
      availableInsurance: rate.available_for_insurance,
    }));

    return NextResponse.json({
      success: true,
      message: "Ongkos kirim berhasil diambil",
      data: {
        rates: formattedRates,
        origin: rates.origin,
        destination: rates.destination,
      },
      rates: formattedRates,
      origin: rates.origin,
      destination: rates.destination,
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[GET_RATES_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil ongkos kirim",
      },
      { status: 500 },
    );
  }
}

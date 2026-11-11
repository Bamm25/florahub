import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: Calculate shipping cost dari florist ke customer address menggunakan Biteship
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const { addressId, items } = body;

    // Validate input params
    if (!addressId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "addressId dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    // Fetch customer address untuk destination
    const customerAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!customerAddress || customerAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan atau bukan milik Anda",
        },
        { status: 404 },
      );
    }

    // Fetch produk untuk ambil floristId dan calculate weight
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        floristId: true,
        weight: true,
        name: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Group items by florist (untuk support multi-florist checkout di masa depan)
    const floristGroups = new Map<string, { floristId: string; totalWeight: number; products: string[] }>();
    
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const qty = item.quantity || 1;
      const weight = product.weight || 500; // Default 500g jika tidak ada weight

      if (!floristGroups.has(product.floristId)) {
        floristGroups.set(product.floristId, {
          floristId: product.floristId,
          totalWeight: 0,
          products: [],
        });
      }

      const group = floristGroups.get(product.floristId)!;
      group.totalWeight += weight * qty;
      group.products.push(product.name);
    }

    // Untuk sekarang ambil florist pertama (single-florist cart)
    const firstGroup = Array.from(floristGroups.values())[0];
    if (!firstGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "Florist tidak ditemukan untuk produk ini",
        },
        { status: 400 },
      );
    }

    // Fetch florist pickup address via FloristProfile
    const floristProfile = await prisma.floristProfile.findUnique({
      where: { userId: firstGroup.floristId },
      include: {
        defaultAddress: true,
      },
    });

    if (!floristProfile?.defaultAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat pickup florist belum diatur",
        },
        { status: 400 },
      );
    }

    const originAddress = floristProfile.defaultAddress;

    // Hit Biteship API untuk get shipping rates
    const biteshipApiKey = process.env.BITESHIP_API_KEY;
    if (!biteshipApiKey) {
      // Fallback ke flat rate 15rb jika Biteship tidak dikonfigurasi
      return NextResponse.json({
        success: true,
        message: "Shipping rate dihitung (fallback flat rate)",
        data: {
          rates: [
            {
              courier: "default",
              service: "Regular",
              price: 15000,
              estimatedDays: "2-3 hari",
            },
          ],
          cheapest: {
            courier: "default",
            service: "Regular",
            price: 15000,
            estimatedDays: "2-3 hari",
          },
        },
      });
    }

    // Biteship pricing API request
    const biteshipPayload = {
      origin_postal_code: parseInt(originAddress.postalCode),
      destination_postal_code: parseInt(customerAddress.postalCode),
      couriers: "jne,jnt,sicepat,anteraja",
      items: [
        {
          name: `Produk bunga (${firstGroup.products.length} item)`,
          description: firstGroup.products.join(", "),
          value: 100000, // Placeholder value untuk insurance calculation
          weight: firstGroup.totalWeight,
          quantity: 1,
        },
      ],
    };

    const biteshipResponse = await fetch("https://api.biteship.com/v1/rates/couriers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: biteshipApiKey,
      },
      body: JSON.stringify(biteshipPayload),
    });

    if (!biteshipResponse.ok) {
      const errorText = await biteshipResponse.text();
      console.error("[BITESHIP_RATES_ERROR]", biteshipResponse.status, errorText);
      // Fallback ke flat rate jika Biteship error
      return NextResponse.json({
        success: true,
        message: "Shipping rate dihitung (fallback karena API error)",
        data: {
          rates: [
            {
              courier: "default",
              service: "Regular",
              price: 15000,
              estimatedDays: "2-3 hari",
            },
          ],
          cheapest: {
            courier: "default",
            service: "Regular",
            price: 15000,
            estimatedDays: "2-3 hari",
          },
        },
      });
    }

    const biteshipData = await biteshipResponse.json();

    // Transform Biteship response ke format kita
    const rates = biteshipData.pricing
      .filter((rate: { available_for_cash_on_delivery: boolean; available_for_instant_waybill_id: boolean }) => 
        rate.available_for_cash_on_delivery === false && 
        rate.available_for_instant_waybill_id === true
      )
      .map((rate: { 
        courier_name: string; 
        courier_service_name: string; 
        price: number; 
        duration: string;
      }) => ({
        courier: rate.courier_name.toUpperCase(),
        service: rate.courier_service_name,
        price: rate.price,
        estimatedDays: rate.duration,
      }))
      .sort((a: { price: number }, b: { price: number }) => a.price - b.price);

    if (rates.length === 0) {
      // Fallback jika tidak ada rates tersedia
      return NextResponse.json({
        success: true,
        message: "Tidak ada kurir tersedia, menggunakan default rate",
        data: {
          rates: [
            {
              courier: "default",
              service: "Regular",
              price: 15000,
              estimatedDays: "2-3 hari",
            },
          ],
          cheapest: {
            courier: "default",
            service: "Regular",
            price: 15000,
            estimatedDays: "2-3 hari",
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Shipping rates berhasil dihitung",
      data: {
        rates: rates,
        cheapest: rates[0],
        origin: {
          city: originAddress.city,
          province: originAddress.province,
        },
        destination: {
          city: customerAddress.city,
          province: customerAddress.province,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("[CALCULATE_SHIPPING_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menghitung ongkos kirim",
      },
      { status: 500 },
    );
  }
}

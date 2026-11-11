import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk menghitung perkiraan tarif pengiriman dari florist ke alamat pelanggan
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const { addressId, items } = body;

    // Validasi kelengkapan parameter alamat dan daftar produk
    if (!addressId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "addressId dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    // Ambil data alamat tujuan pelanggan
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

    // Ambil data produk untuk mendapatkan ID florist dan bobot barang
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

    // Kelompokkan item produk berdasarkan ID florist pengirim
    const floristGroups = new Map<string, { floristId: string; totalWeight: number; products: string[] }>();
    
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const qty = item.quantity || 1;
      const weight = product.weight || 500;

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

    // Ambil data kelompok florist pertama untuk transaksi toko tunggal
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

    // Ambil alamat asal penjemputan florist melalui profil florist
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

    // Periksa ketersediaan kredensial API Biteship
    const biteshipApiKey = process.env.BITESHIP_API_KEY;
    if (!biteshipApiKey) {
      // Gunakan tarif flat cadangan jika kunci API Biteship belum disetel
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

    // Siapkan muatan permintaan ke API Biteship
    const biteshipPayload = {
      origin_postal_code: parseInt(originAddress.postalCode),
      destination_postal_code: parseInt(customerAddress.postalCode),
      couriers: "jne,jnt,sicepat,anteraja",
      items: [
        {
          name: `Produk bunga (${firstGroup.products.length} item)`,
          description: firstGroup.products.join(", "),
          value: 100000,
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
      // Gunakan tarif flat cadangan jika terjadi kesalahan pada API Biteship
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

    // Format respons opsi tarif kurir dari Biteship
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
      // Gunakan opsi kurir default jika tidak ada tarif yang memenuhi kriteria
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

    // Kirim respons daftar opsi tarif pengiriman beserta kurir termurah
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

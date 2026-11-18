import { reportServerError } from "@/lib/server-error-report";
// Endpoint untuk memeriksa tarif ongkos kirim melalui Biteship API
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getFloristPickupAddress } from "@/lib/florist-pickup-address";
import { getBiteshipClient } from "@/lib/biteship";
import type { BiteshipRateItem } from "@/lib/biteship";

// Handler HTTP POST untuk mengecek tarif ongkos kirim pesanan melalui Biteship
export async function POST(req: NextRequest) {
  try {
    // Autentikasi sesi pengguna
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const sessionUser = session.user as { id?: string; role?: string };
    const userId = sessionUser.id;
    const userRole = sessionUser.role;

    // Verifikasi peran pengguna harus florist
    if (userRole !== "FLORIST" || !userId) {
      return NextResponse.json(
        { success: false, message: "Hanya florist yang dapat cek ongkir" },
        { status: 403 }
      );
    }

    // Parsing dan validasi request body
    const body = await req.json();
    const { orderId, couriers } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil data pesanan beserta relasi pembeli dan produk
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                florist: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi hak kepemilikan pesanan oleh florist
    const floristId = order.items[0]?.product?.florist?.id;
    if (!floristId || floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke order ini" },
        { status: 403 }
      );
    }

    // Gunakan alamat penjemputan dari profil florist
    const floristAddress = await getFloristPickupAddress(userId);

    if (!floristAddress || !floristAddress.postalCode) {
      return NextResponse.json(
        { success: false, message: "Florist belum melengkapi data kode pos" },
        { status: 400 }
      );
    }

    // Ambil alamat default pembeli
    const customerAddress = order.user.addresses[0];
    if (!customerAddress) {
      return NextResponse.json(
        { success: false, message: "Customer belum memiliki alamat default" },
        { status: 400 }
      );
    }

    // Siapkan data barang untuk perhitungan tarif ongkir Biteship
    const items: BiteshipRateItem[] = order.items.map((item) => ({
      name: item.product?.name || "Produk Florist",
      value: Math.round(item.price),
      quantity: item.quantity,
      height: 10,
      length: 15,
      width: 10,
      weight: 500 * item.quantity,
    }));

    // Ambil kalkulasi tarif ongkos kirim dari Biteship
    const biteshipClient = getBiteshipClient();
    const rates = await biteshipClient.getRates(
      parseInt(floristAddress.postalCode),
      parseInt(customerAddress.postalCode),
      items,
      couriers || ["jne", "jnt", "sicepat", "anteraja", "ninja"]
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

    // Kembalikan respon sukses daftar tarif ongkos kirim
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
    // Tangani error internal server
    reportServerError("[GET_RATES_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal mengambil ongkos kirim",
      },
      { status: 500 }
    );
  }
}

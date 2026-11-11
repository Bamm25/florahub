// Endpoint untuk auto-create shipment dengan Biteship API (generate AWB otomatis)
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getFloristPickupAddress } from "@/lib/florist-pickup-address";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import type { BiteshipOrderRequest } from "@/lib/biteship";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "FLORIST") {
      return NextResponse.json(
        { success: false, message: "Hanya florist yang dapat membuat pengiriman otomatis" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, courierCompany, courierType, deliveryType, deliveryDate, deliveryTime } = body;

    console.log('[AUTO-CREATE] Request body:', { orderId, courierCompany, courierType });

    if (!orderId || !courierCompany || !courierType) {
      console.log('[AUTO-CREATE] Validation failed:', { orderId, courierCompany, courierType });
      return NextResponse.json(
        { success: false, message: "orderId, courierCompany, dan courierType wajib diisi" },
        { status: 400 }
      );
    }

    // Get order dengan relasi lengkap
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

    // Validate ownership (cek dari product florist)
    const floristId = order.items[0]?.product?.florist?.id;
    if (!floristId || floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke order ini" },
        { status: 403 }
      );
    }

    // Validate order status
    if (order.status !== "PAID") {
      return NextResponse.json(
        { success: false, message: "Hanya order dengan status PAID yang dapat dibuatkan pengiriman otomatis" },
        { status: 400 }
      );
    }

    // Check existing shipment
    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId: order.id },
    });

    if (existingShipment) {
      return NextResponse.json(
        { success: false, message: "Order ini sudah memiliki shipment" },
        { status: 400 }
      );
    }

    // Get customer address
    const customerAddress = order.user.addresses[0];
    if (!customerAddress) {
      return NextResponse.json(
        { success: false, message: "Customer belum memiliki alamat default" },
        { status: 400 }
      );
    }

    // Gunakan alamat pickup default dari profil florist.
    const florist = order.items[0].product.florist;
    const floristAddress = await getFloristPickupAddress(florist.id);

    if (!floristAddress || !floristAddress.postalCode) {
      return NextResponse.json(
        { success: false, message: "Florist belum melengkapi data alamat dan kode pos" },
        { status: 400 }
      );
    }

    // Prepare items untuk Biteship
    const biteshipItems = order.items.map((item: any) => ({
      name: item.product?.name || "Produk Florist",
      description: item.product?.description || "",
      value: Math.round(item.price), // IDR
      quantity: item.quantity,
      height: 10, // cm (default, bisa disesuaikan)
      length: 15, // cm
      width: 10, // cm
      weight: 500 * item.quantity, // gram (default 500g per produk)
    }));

    // Create order di Biteship
    const biteshipClient = getBiteshipClient();
    const biteshipRequest: BiteshipOrderRequest = {
      shipper_contact_name: florist.name,
      shipper_contact_phone: floristAddress.phone || "08123456789",
      shipper_contact_email: florist.email,
      shipper_organization: "FloraHub Florist",
      origin_contact_name: florist.name,
      origin_contact_phone: floristAddress.phone || "08123456789",
      origin_address: floristAddress.fullAddress,
      origin_postal_code: parseInt(floristAddress.postalCode),
      origin_note: floristAddress.city || "",
      destination_contact_name: customerAddress.recipientName,
      destination_contact_phone: customerAddress.phone,
      destination_contact_email: order.user.email,
      destination_address: `${customerAddress.fullAddress}, ${customerAddress.city}, ${customerAddress.province}`,
      destination_postal_code: parseInt(customerAddress.postalCode),
      destination_note: "",
      delivery_type: deliveryType || "now",
      delivery_date: deliveryDate || undefined,
      delivery_time: deliveryTime || undefined,
      courier_company: courierCompany,
      courier_type: courierType,
      order_note: `Order #${order.orderNumber}`,
      reference_id: order.orderNumber,
      items: biteshipItems,
    };

    let biteshipOrder;
    try {
      biteshipOrder = await biteshipClient.createOrder(biteshipRequest);
    } catch (biteshipError: any) {
      console.error("[BITESHIP_CREATE_ERROR]", biteshipError);
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      return NextResponse.json(
        { success: false, message: `Biteship API error: ${biteshipError.message || "Gagal membuat shipment"}` },
        { status: 502 },
      );
    }

    // Ambil order id dan nomor resi dari struktur response Biteship
    const biteshipOrderId = biteshipOrder.id || (biteshipOrder as any).order_id;
    const waybillId = biteshipOrder.courier?.waybill_id || (biteshipOrder as any).waybill_id || null;

    // Tolak penyimpanan shipment jika Biteship tidak mengembalikan order id
    if (!biteshipOrderId) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      return NextResponse.json(
        { success: false, message: "Biteship tidak mengembalikan order id" },
        { status: 502 },
      );
    }

    const courierCompanyCode = (biteshipOrder.courier?.company || courierCompany).toUpperCase();
    
    // Ambil URL PDF shipping label resmi dari Biteship
    let biteshipLabelUrl: string | null = null;
    try {
      biteshipLabelUrl = await biteshipClient.getShippingLabel(biteshipOrderId);
    } catch {
      biteshipLabelUrl = null;
    }

    // Create shipment di database dengan data dari Biteship
    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        trackingNumber: waybillId,
        courier: courierCompanyCode,
        service: courierType.toUpperCase(),
        estimatedDays: 3, // Default estimasi hari pengiriman
        shippingCost: Math.round(biteshipOrder.price),
        weight: biteshipItems.reduce((sum: number, item: any) => sum + item.weight * item.quantity, 0),
        status: mapBiteshipStatus(biteshipOrder.status),
        biteshipOrderId: biteshipOrderId,
        biteshipLabelUrl,
      },
    });

    // Update order status ke PROCESSING
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PROCESSING" },
    });

    // Create notification untuk customer
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "SHIPMENT_UPDATE",
        title: "Pesanan Sedang Diproses",
        message: `Pesanan #${order.orderNumber} sedang dipersiapkan oleh ${florist.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengiriman berhasil dibuat dengan nomor resi otomatis",
      data: {
        shipment,
        biteshipOrderId,
        trackingNumber: waybillId,
        courier: biteshipOrder.courier,
        labelUrl: biteshipLabelUrl,
      },
    });
  } catch (error: any) {
    console.error("[AUTO_CREATE_SHIPMENT_ERROR]", error);
    console.error("[AUTO_CREATE_SHIPMENT_ERROR] Stack:", error.stack);
    console.error("[AUTO_CREATE_SHIPMENT_ERROR] Response:", error.response?.data);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal membuat pengiriman otomatis",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

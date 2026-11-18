import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { DEFAULT_PRODUCT_WEIGHT_GRAMS } from "@/lib/config/domain";
import prisma from "@/lib/prisma";
import { getFloristPickupAddress } from "@/lib/florist-pickup-address";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import type { BiteshipOrderRequest } from "@/lib/biteship";
import { NextRequest, NextResponse } from "next/server";

// Handler HTTP POST untuk membuat pengiriman otomatis Biteship dan menerbitkan nomor resi
export async function POST(req: NextRequest) {
  try {
    const { userId, userRole } = await requireAuth(req, ["FLORIST", "ADMIN"]);

    const body = await req.json();
    const {
      orderId,
      courierCompany,
      courierType,
      deliveryType,
      deliveryDate,
      deliveryTime,
    } = body;

    if (!orderId || !courierCompany || !courierType) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId, courierCompany, dan courierType wajib diisi",
        },
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
            name: true,
            email: true,
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
                florist: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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

    const isOwner = order.items.some(
      (item) => item.product?.florist?.id === userId,
    );
    if (userRole !== "ADMIN" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke order ini" },
        { status: 403 },
      );
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hanya order dengan status PAID yang dapat dibuatkan pengiriman otomatis",
        },
        { status: 400 },
      );
    }

    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId: order.id },
    });

    if (existingShipment) {
      return NextResponse.json(
        { success: false, message: "Order ini sudah memiliki shipment" },
        { status: 400 },
      );
    }

    // Prioritaskan alamat yang dipilih pelanggan saat checkout sebelum jatuh ke alamat default
    const customerAddress = order.address || order.user.addresses[0];
    if (!customerAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tujuan pelanggan belum tersedia pada pesanan ini",
        },
        { status: 400 },
      );
    }

    const florist = order.items[0]?.product?.florist;
    if (!florist) {
      return NextResponse.json(
        { success: false, message: "Data florist pada pesanan tidak valid" },
        { status: 400 },
      );
    }

    const floristAddress = await getFloristPickupAddress(florist.id);
    if (!floristAddress || !floristAddress.postalCode || !floristAddress.phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Florist wajib melengkapi alamat pickup, nomor telepon, dan kode pos terlebih dahulu",
        },
        { status: 400 },
      );
    }

    const biteshipItems = order.items.map((item) => ({
      name: item.product?.name || "Produk Florist",
      description: item.product?.description || "",
      value: Math.round(item.price),
      quantity: item.quantity,
      height: 10,
      length: 15,
      width: 10,
      weight:
        (item.product?.weight || DEFAULT_PRODUCT_WEIGHT_GRAMS) * item.quantity,
    }));

    const biteshipClient = getBiteshipClient();
    const biteshipRequest: BiteshipOrderRequest = {
      shipper_contact_name: florist.name,
      shipper_contact_phone: floristAddress.phone,
      shipper_contact_email: florist.email,
      shipper_organization: "FloraHub Florist",
      origin_contact_name: florist.name,
      origin_contact_phone: floristAddress.phone,
      origin_address: floristAddress.fullAddress,
      origin_postal_code: Number.parseInt(floristAddress.postalCode, 10),
      origin_note: floristAddress.city || "",
      destination_contact_name: customerAddress.recipientName,
      destination_contact_phone: customerAddress.phone,
      destination_contact_email: order.user.email,
      destination_address: `${customerAddress.fullAddress}, ${customerAddress.city}, ${customerAddress.province}`,
      destination_postal_code: Number.parseInt(customerAddress.postalCode, 10),
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
    } catch (biteshipError: unknown) {
      reportServerError("[BITESHIP_CREATE_ERROR]", biteshipError);
      return NextResponse.json(
        {
          success: false,
          message: "Gagal membuat shipment melalui layanan kurir Biteship",
        },
        { status: 502 },
      );
    }

    const biteshipOrderId = biteshipOrder.id;
    const waybillId =
      biteshipOrder.courier?.waybill_id || biteshipOrder.waybill_id || null;

    if (!biteshipOrderId) {
      return NextResponse.json(
        { success: false, message: "Biteship tidak mengembalikan order id" },
        { status: 502 },
      );
    }

    const courierCompanyCode = (
      biteshipOrder.courier?.company || courierCompany
    ).toUpperCase();

    let biteshipLabelUrl: string | null = null;
    try {
      biteshipLabelUrl = await biteshipClient.getShippingLabel(biteshipOrderId);
    } catch {
      biteshipLabelUrl = null;
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        trackingNumber: waybillId,
        courier: courierCompanyCode,
        service: courierType.toUpperCase(),
        estimatedDays: 3,
        shippingCost: Math.round(biteshipOrder.price),
        weight: biteshipItems.reduce(
          (sum, item) => sum + item.weight * item.quantity,
          0,
        ),
        status: mapBiteshipStatus(biteshipOrder.status),
        biteshipOrderId: biteshipOrderId,
        biteshipLabelUrl,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PROCESSING" },
    });

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
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("[AUTO_CREATE_SHIPMENT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat pengiriman otomatis",
      },
      { status: 500 },
    );
  }
}

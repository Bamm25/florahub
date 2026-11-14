import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient, mapBiteshipStatus } from "@/lib/biteship";
import { fulfillPreOrderToInventory, fulfillSaleToInventory } from "@/lib/supply-chain/fulfill-inventory";
import type { BiteshipOrderRequest } from "@/lib/biteship";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk membuat pengiriman otomatis Biteship dan menerbitkan nomor resi resmi
export async function POST(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, ["SUPPLIER", "ADMIN"]);
    const body = await request.json();
    const { orderType, orderId, courierCompany, courierType } = body;

    if (!["PREORDER", "DIRECT_SALE"].includes(orderType) || typeof orderId !== "string" || !orderId || !courierCompany || !courierType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "orderType, orderId, courierCompany, dan courierType wajib diisi",
        },
        { status: 400 },
      );
    }

    let supplierId = userId;
    let floristUser: any = null;
    let floristAddress: any = null;
    let itemName = "";
    let itemValue = 0;
    let quantity = 1;

    if (orderType === "PREORDER") {
      const preOrder = await prisma.harvestPreOrder.findUnique({
        where: { id: orderId },
        include: {
          announcement: true,
          florist: {
            include: {
              addresses: {
                where: { isDefault: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!preOrder) {
        return NextResponse.json(
          { success: false, message: "Pre-order tidak ditemukan" },
          { status: 404 },
        );
      }

      if (userRole !== "ADMIN" && preOrder.announcement.supplierId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      if (preOrder.biteshipOrderId) return NextResponse.json({ success: false, message: "Pengiriman sudah dibuat" }, { status: 409 });
      if (preOrder.status !== "PAID") {
        return NextResponse.json(
          {
            success: false,
            message: `Hanya pesanan berstatus PAID yang dapat dikirim. Status saat ini: ${preOrder.status}`,
          },
          { status: 400 },
        );
      }

      supplierId = preOrder.announcement.supplierId;
      floristUser = preOrder.florist;
      floristAddress = preOrder.florist.addresses[0];
      itemName = preOrder.announcement.flowerName;
      itemValue = preOrder.totalPrice;
      quantity = preOrder.quantity;
    } else {
      const sale = await prisma.stockTransaction.findUnique({
        where: { id: orderId },
        include: {
          stock: true,
          florist: {
            include: {
              addresses: {
                where: { isDefault: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!sale) {
        return NextResponse.json(
          { success: false, message: "Transaksi penjualan tidak ditemukan" },
          { status: 404 },
        );
      }

      if (userRole !== "ADMIN" && sale.stock.supplierId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      if (sale.biteshipOrderId) return NextResponse.json({ success: false, message: "Pengiriman sudah dibuat" }, { status: 409 });
      if (sale.status !== "PAID") {
        return NextResponse.json(
          {
            success: false,
            message: `Hanya pesanan berstatus PAID yang dapat dikirim. Status saat ini: ${sale.status}`,
          },
          { status: 400 },
        );
      }

      supplierId = sale.stock.supplierId;
      floristUser = sale.florist;
      floristAddress = sale.florist.addresses[0];
      itemName = sale.stock.name;
      itemValue = sale.totalPrice;
      quantity = sale.quantity;
    }

    // 1. Data Pengirim (Kebun Supplier)
    const supplierAddress = await prisma.address.findFirst({ where: { userId: supplierId }, orderBy: { isDefault: "desc" } });
    const supplierUser = await prisma.user.findUnique({
      where: { id: supplierId },
      select: { name: true, phone: true, email: true },
    });

    // 2. Data Penerima (Toko Florist)
    if (!floristAddress) {
      floristAddress = await prisma.address.findFirst({
        where: { userId: floristUser.id },
      });
    }

    const validPostal = (value: string | null | undefined) => !!value && /^\d{5}$/.test(value);
    const validPhone = (value: string | null | undefined) => !!value && /^0\d{8,13}$/.test(value.replace(/\D/g, "").replace(/^62/, "0"));
    if (!supplierAddress || !supplierUser || !floristAddress ||
        !supplierAddress.fullAddress?.trim() || !floristAddress.fullAddress?.trim() ||
        !supplierAddress.recipientName?.trim() || !floristUser.name?.trim() ||
        !validPostal(supplierAddress.postalCode) || !validPostal(floristAddress.postalCode) ||
        !validPhone(supplierAddress.phone) || !validPhone(floristAddress.phone || floristUser.phone) ||
        !validPhone(supplierUser.phone)) {
      return NextResponse.json({ success: false, message: "Lengkapi alamat, kode pos, dan nomor telepon pengirim/penerima yang valid" }, { status: 400 });
    }
    const destPostal = floristAddress.postalCode;
    const destAddress = floristAddress.fullAddress;
    const destCity = floristAddress.city;
    const destPhone = floristAddress.phone || floristUser.phone;

    const weightInGrams = Math.max(1000, quantity * 100);

    // 3. Susun Permintaan ke Biteship — sama persis dengan pola florist/shipments/auto-create
    const biteshipPayload: BiteshipOrderRequest = {
      shipper_contact_name: supplierUser.name,
      shipper_contact_phone: supplierUser.phone!.replace(/\D/g, "").replace(/^62/, "0"),
      shipper_contact_email: supplierUser.email || "",
      shipper_organization: "FloraHub Supplier Network",
      origin_contact_name: supplierAddress.recipientName,
      origin_contact_phone: supplierAddress.phone.replace(/\D/g, "").replace(/^62/, "0"),
      origin_address: supplierAddress.fullAddress,
      origin_note: supplierAddress.city || "",
      origin_postal_code: parseInt(supplierAddress.postalCode, 10),
      destination_contact_name: floristUser.name,
      destination_contact_phone: destPhone.replace(/\D/g, "").replace(/^62/, "0"),
      destination_contact_email: floristUser.email,
      destination_address: `${destAddress}, ${destCity}`,
      destination_postal_code: parseInt(destPostal, 10),
      destination_note: "",
      delivery_type: "now",
      courier_company: courierCompany,
      courier_type: courierType,
      order_note: `Pasokan bunga FloraHub — ${itemName}`,
      reference_id: orderId,
      items: [
        {
          name: `Bunga Potong Segar - ${itemName}`,
          description: "Bunga segar dari kebun mitra",
          value: Math.round(itemValue),
          quantity: 1,
          height: 20,
          length: 40,
          width: 20,
          weight: weightInGrams,
        },
      ],
    };

    // 4. Eksekusi Order Biteship — dengan try/catch terpisah agar error detail dari Biteship terekspos
    const biteshipClient = getBiteshipClient();
    let biteshipOrder;
    try {
      biteshipOrder = await biteshipClient.createOrder(biteshipPayload);
    } catch (biteshipError: any) {
      console.error("[SUPPLIER_BITESHIP_CREATE_ERROR]", biteshipError?.response?.data || biteshipError?.message || biteshipError);
      return NextResponse.json(
        {
          success: false,
          message: `Biteship API error: ${biteshipError?.response?.data?.message || biteshipError?.message || "Gagal membuat shipment"}`,
        },
        { status: 502 },
      );
    }

    const biteshipOrderId =
      biteshipOrder.id || (biteshipOrder as any).order_id;
    const waybillId =
      biteshipOrder.courier?.waybill_id ||
      (biteshipOrder as any).waybill_id ||
      null;
    if (!biteshipOrderId) return NextResponse.json({ success: false, message: "Biteship tidak mengembalikan order ID" }, { status: 502 });
    const courierCompanyCode = (
      biteshipOrder.courier?.company || courierCompany
    ).toUpperCase();
    const serviceName =
      biteshipOrder.courier?.type ||
      (biteshipOrder.courier as any)?.service_name ||
      courierType;

    let biteshipLabelUrl: string | null = null;
    try {
      if (biteshipOrderId) {
        biteshipLabelUrl = await biteshipClient.getShippingLabel(biteshipOrderId);
      }
    } catch {
      biteshipLabelUrl = null;
    }

    // Booking is not courier pickup. Only an observed picked/in-transit status is SHIPPED.
    const pickedUp = ["SHIPPED", "DELIVERED"].includes(mapBiteshipStatus(biteshipOrder.status));
    const now = new Date();

    // 5. Simpan Hasil Resi Otomatis ke Database
    if (orderType === "PREORDER") {
      const booked = await prisma.harvestPreOrder.updateMany({
        where: { id: orderId, status: "PAID", biteshipOrderId: null },
        data: {
          status: pickedUp ? "SHIPPED" : "PAID",
          courier: courierCompanyCode,
          service: serviceName,
          trackingNumber: waybillId,
          biteshipOrderId: biteshipOrderId || null,
          biteshipLabelUrl: biteshipLabelUrl || null,
          shippingCost: Math.round(biteshipOrder.price || 0),
          weight: weightInGrams,
          shippedAt: pickedUp ? now : undefined,
        },
      });

      if (!booked.count) return NextResponse.json({ success: false, message: "Pengiriman sudah dibuat; periksa order Biteship sebelum mencoba lagi" }, { status: 409 });
      if (mapBiteshipStatus(biteshipOrder.status) === "DELIVERED") await fulfillPreOrderToInventory(orderId);
      await prisma.notification.create({
        data: {
          userId: floristUser.id,
          title: "Bunga Pre-Order Dikirim via Biteship!",
          message: `Supplier telah membuat pesanan penjemputan via ${courierCompanyCode} (${serviceName}). ${waybillId ? `Nomor resi: ${waybillId}.` : "Nomor resi menunggu kurir."}`,
          type: "SHIPMENT_UPDATE",
          link: `/florist/harvest-plans`,
          isRead: false,
        },
      });
    } else {
      const booked = await prisma.stockTransaction.updateMany({
        where: { id: orderId, status: "PAID", biteshipOrderId: null },
        data: {
          status: pickedUp ? "SHIPPED" : "PAID",
          courier: courierCompanyCode,
          service: serviceName,
          trackingNumber: waybillId,
          biteshipOrderId: biteshipOrderId || null,
          biteshipLabelUrl: biteshipLabelUrl || null,
          shippingCost: Math.round(biteshipOrder.price || 0),
          weight: weightInGrams,
          shippedAt: pickedUp ? now : undefined,
        },
      });

      if (!booked.count) return NextResponse.json({ success: false, message: "Pengiriman sudah dibuat; periksa order Biteship sebelum mencoba lagi" }, { status: 409 });
      if (mapBiteshipStatus(biteshipOrder.status) === "DELIVERED") await fulfillSaleToInventory(orderId);
      await prisma.notification.create({
        data: {
          userId: floristUser.id,
          title: "Bahan Baku Dikirim via Biteship!",
          message: `Supplier telah mengirim pesanan pasokan bunga via ${courierCompanyCode} (${serviceName}). ${waybillId ? `Nomor resi: ${waybillId}.` : "Nomor resi menunggu kurir."}`,
          type: "SHIPMENT_UPDATE",
          link: `/florist/inventory`,
          isRead: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Pengiriman Biteship dibuat${waybillId ? `, resi: ${waybillId}` : "; menunggu resi kurir"}`,
      data: {
        biteshipOrderId,
        trackingNumber: waybillId,
        courier: courierCompanyCode,
        service: serviceName,
        shippingCost: biteshipOrder.price,
        labelUrl: biteshipLabelUrl,
      },
    });
  } catch (error) {
    console.error("Error auto-creating Biteship order for supplier:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat pengiriman otomatis Biteship",
      },
      { status: 500 },
    );
  }
}

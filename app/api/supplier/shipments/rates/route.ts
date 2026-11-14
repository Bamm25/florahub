import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import type { BiteshipRateItem } from "@/lib/biteship";
import { NextResponse } from "next/server";

// Handler HTTP POST untuk mengecek tarif kurir Biteship dari kebun supplier ke florist
export async function POST(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, ["SUPPLIER", "ADMIN"]);
    const body = await request.json();
    const { orderType, orderId } = body;

    if (!["PREORDER", "DIRECT_SALE"].includes(orderType) || typeof orderId !== "string" || !orderId) {
      return NextResponse.json(
        { success: false, message: "orderType dan orderId wajib diisi" },
        { status: 400 },
      );
    }

    let supplierId = userId;
    let floristId = "";
    let itemName = "";
    let itemValue = 0;
    let quantity = 1;

    if (orderType === "PREORDER") {
      const preOrder = await prisma.harvestPreOrder.findUnique({
        where: { id: orderId },
        include: { announcement: true },
      });
      if (!preOrder) {
        return NextResponse.json(
          { success: false, message: "Pre-order tidak ditemukan" },
          { status: 404 },
        );
      }
      if (userRole !== "ADMIN" && preOrder.announcement.supplierId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      if (preOrder.status !== "PAID" || preOrder.biteshipOrderId) return NextResponse.json({ success: false, message: "Pesanan tidak siap dikirim" }, { status: 409 });
      supplierId = preOrder.announcement.supplierId;
      floristId = preOrder.floristId;
      itemName = preOrder.announcement.flowerName;
      itemValue = preOrder.totalPrice;
      quantity = preOrder.quantity;
    } else {
      const sale = await prisma.stockTransaction.findUnique({
        where: { id: orderId },
        include: { stock: true },
      });
      if (!sale) {
        return NextResponse.json(
          { success: false, message: "Transaksi penjualan tidak ditemukan" },
          { status: 404 },
        );
      }
      if (userRole !== "ADMIN" && sale.stock.supplierId !== userId) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      if (sale.status !== "PAID" || sale.biteshipOrderId) return NextResponse.json({ success: false, message: "Pesanan tidak siap dikirim" }, { status: 409 });
      supplierId = sale.stock.supplierId;
      floristId = sale.floristId;
      itemName = sale.stock.name;
      itemValue = sale.totalPrice;
      quantity = sale.quantity;
    }

    // 1. Alamat asal penjemputan (Kebun Supplier)
    const supplierAddress = await prisma.address.findFirst({ where: { userId: supplierId }, orderBy: { isDefault: "desc" } });
    if (!supplierAddress?.postalCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat kebun supplier belum memiliki kode pos",
        },
        { status: 400 },
      );
    }

    // 2. Alamat tujuan pengantaran (Toko Florist)
    let floristAddress = await prisma.address.findFirst({
      where: { userId: floristId, isDefault: true },
    });
    if (!floristAddress) {
      floristAddress = await prisma.address.findFirst({
        where: { userId: floristId },
      });
    }

    if (!floristAddress || !/^\d{5}$/.test(floristAddress.postalCode) || !/^\d{5}$/.test(supplierAddress.postalCode)) {
      return NextResponse.json({ success: false, message: "Alamat penjemputan/tujuan dan kode pos valid wajib diisi" }, { status: 400 });
    }
    const destinationPostalCode = floristAddress.postalCode;

    // 3. Spesifikasi barang untuk Biteship
    const weightInGrams = Math.max(1000, quantity * 100); // minimal 1 kg untuk kurir ekspedisi
    const items: BiteshipRateItem[] = [
      {
        name: `Bunga Potong Segar - ${itemName}`,
        value: Math.round(itemValue),
        quantity: 1,
        height: 20,
        length: 40,
        width: 20,
        weight: weightInGrams,
      },
    ];

    // 4. Panggil Biteship Client
    const biteshipClient = getBiteshipClient();
    const ratesData = await biteshipClient.getRates(
      parseInt(supplierAddress.postalCode, 10),
      parseInt(destinationPostalCode, 10),
      items,
      ["jne", "jnt", "sicepat", "anteraja"],
    );

    const formattedRates = (ratesData.pricing || []).map((r: any) => ({
      courier: {
        code: r.courier_code || r.company,
        name: r.courier_name,
        service_name: r.courier_service_name,
        service_code: r.courier_service_code,
      },
      price: r.price,
      estimated_days: r.duration || r.shipment_duration_range,
      rate_id: `${r.courier_code || r.company}-${r.courier_service_code}`,
      rate_name: `${r.courier_name} ${r.courier_service_name} (${r.duration || "1-2 hari"}) - Rp ${r.price.toLocaleString("id-ID")}`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        origin: {
          city: supplierAddress.city,
          postalCode: supplierAddress.postalCode,
        },
        destination: {
          city: floristAddress.city,
          postalCode: destinationPostalCode,
        },
        rates: formattedRates,
      },
    });
  } catch (error) {
    reportServerError("Error calculating Biteship rates for supplier:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal menghitung tarif kurir Biteship",
      },
      { status: 500 },
    );
  }
}

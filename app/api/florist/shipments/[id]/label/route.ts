import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { NextResponse } from "next/server";

// Endpoint untuk mengambil atau membuka file PDF shipping label resmi Biteship
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, message: "Shipment tidak ditemukan" }, { status: 404 });
    }

    // Jika URL sudah berupa link S3 PDF publik, langsung redirect
    if (shipment.biteshipLabelUrl && shipment.biteshipLabelUrl.includes("biteship.s3") && !shipment.biteshipLabelUrl.includes("undefined")) {
      return NextResponse.redirect(shipment.biteshipLabelUrl, 307);
    }

    if (!shipment.biteshipOrderId) {
      return NextResponse.json({ success: false, message: "Shipment tidak terhubung ke Biteship" }, { status: 400 });
    }

    // Ambil URL PDF shipping label resmi dari Biteship API dengan API Key
    const client = getBiteshipClient();
    const pdfUrl = await client.getShippingLabel(shipment.biteshipOrderId);

    if (!pdfUrl) {
      return NextResponse.json({ success: false, message: "Gagal mengambil URL PDF label dari Biteship" }, { status: 502 });
    }

    // Simpan link S3 PDF ke database untuk penggunaan berikutnya
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { biteshipLabelUrl: pdfUrl },
    });

    return NextResponse.redirect(pdfUrl, 307);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal error" },
      { status: 500 },
    );
  }
}

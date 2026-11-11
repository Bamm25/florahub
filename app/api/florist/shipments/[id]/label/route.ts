import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { getBiteshipClient } from "@/lib/biteship";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil atau membuka file PDF shipping label resmi Biteship
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Ambil parameter ID pengiriman dari URL
    const { id } = await params;

    // Cari data pengiriman berdasarkan ID
    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    // Validasi keberadaan data pengiriman
    if (!shipment) {
      return NextResponse.json({ success: false, message: "Shipment tidak ditemukan" }, { status: 404 });
    }

    // Alihkan langsung jika tautan PDF label publik sudah tersedia
    if (shipment.biteshipLabelUrl && shipment.biteshipLabelUrl.includes("biteship.s3") && !shipment.biteshipLabelUrl.includes("undefined")) {
      return NextResponse.redirect(shipment.biteshipLabelUrl, 307);
    }

    // Validasi keterhubungan pengiriman dengan Biteship
    if (!shipment.biteshipOrderId) {
      return NextResponse.json({ success: false, message: "Shipment tidak terhubung ke Biteship" }, { status: 400 });
    }

    // Ambil tautan label pengiriman resmi dari Biteship API
    const client = getBiteshipClient();
    const pdfUrl = await client.getShippingLabel(shipment.biteshipOrderId);

    if (!pdfUrl) {
      return NextResponse.json({ success: false, message: "Gagal mengambil URL PDF label dari Biteship" }, { status: 502 });
    }

    // Simpan tautan label pengiriman ke database untuk permintaan berikutnya
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { biteshipLabelUrl: pdfUrl },
    });

    // Alihkan ke URL label pengiriman Biteship
    return NextResponse.redirect(pdfUrl, 307);
  } catch (error: any) {
    // Tangani error otorisasi atau internal server error
    return NextResponse.json(
      { success: false, message: error.message || "Internal error" },
      { status: 500 },
    );
  }
}

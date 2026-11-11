import { createAuditLog } from "@/lib/auditLog";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createShipmentSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { calculateEstimatedDays } from "@/lib/utils/estimateDelivery";

// Handler HTTP POST untuk membuat pengiriman pesanan secara manual oleh florist
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil metadata IP address dan user-agent untuk audit log
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = createShipmentSchema.parse(body);
    const { orderId, courier, service, trackingNumber, estimatedDays, weight } = validated;
    
    // Konversi bobot pengiriman dari kg ke gram
    const weightInGrams = weight ? Math.round(weight * 1000) : null;

    // Ambil data pesanan beserta relasi item dan alamat pengiriman
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { 
                floristId: true,
                florist: {
                  select: {
                    addresses: {
                      where: { isDefault: true },
                      select: { city: true, province: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        address: {
          select: { city: true, province: true },
        },
        shipment: true,
      },
    });

    // Validasi keberadaan data pesanan
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi apakah pesanan sudah memiliki pengiriman
    if (order.shipment) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ini sudah memiliki shipment",
        },
        { status: 400 },
      );
    }

    // Validasi hak kepemilikan pesanan oleh florist
    const isOwner = order.items.some(
      (item) => item.product.floristId === floristId,
    );
    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Order ini bukan milik Anda",
        },
        { status: 403 },
      );
    }

    // Validasi status pesanan harus PAID sebelum dapat dikirim
    if (order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat membuat shipment: status order saat ini "${order.status}". Hanya order dengan status PAID yang dapat dikirim`,
        },
        { status: 400 },
      );
    }

    // Hitung estimasi hari pengiriman berdasarkan lokasi jika belum ditentukan
    let calculatedEstimatedDays = estimatedDays;
    
    if (!calculatedEstimatedDays && order.address) {
      // Ambil lokasi florist dari data produk pertama
      const firstProduct = order.items[0]?.product;
      const floristAddress = firstProduct?.florist?.addresses?.[0];
      
      if (floristAddress && order.address.city && order.address.province) {
        calculatedEstimatedDays = calculateEstimatedDays(
          {
            city: order.address.city,
            province: order.address.province,
          },
          {
            city: floristAddress.city,
            province: floristAddress.province,
          }
        );
      } else {
        // Nilai default estimasi 2 hari jika data lokasi belum lengkap
        calculatedEstimatedDays = 2;
      }
    }

    // Simpan data pengiriman, perbarui status pesanan, dan buat notifikasi dalam transaksi atomic
    const [shipment] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          orderId: order.id,
          courier: courier.trim(),
          service: service?.trim() || null,
          trackingNumber: trackingNumber?.trim() || null,
          status: "PENDING",
          estimatedDays: calculatedEstimatedDays || 2,
          shippingCost: order.shippingCost,
          weight: weightInGrams,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: "PROCESSING" },
      }),
      // Kirim notifikasi pembuatan pengiriman ke pembeli
      prisma.notification.create({
        data: {
          userId: order.userId,
          title: "Pengiriman Disiapkan",
          message: `Pengiriman pesanan #${order.orderNumber} telah dibuat via ${courier.trim()}${trackingNumber ? ` dengan nomor resi ${trackingNumber.trim()}` : ""}. Status pengiriman akan diperbarui saat paket benar-benar dikirim.`,
          type: "SHIPMENT_UPDATE",
          link: `/orders/${order.id}`,
          isRead: false,
        },
      }),
    ]);

    // Catat pembuatan data pengiriman ke audit log
    await createAuditLog({
      userId: floristId,
      action: "CREATE",
      entity: "Shipment",
      entityId: shipment.id,
      newValue: {
        orderId: shipment.orderId,
        courier: shipment.courier,
        service: shipment.service,
        trackingNumber: shipment.trackingNumber,
        shippingCost: shipment.shippingCost,
      },
      ipAddress,
      userAgent,
    });

    // Kembalikan respon sukses pembuatan pengiriman
    return NextResponse.json(
      {
        success: true,
        message: "Shipment berhasil dibuat",
        data: { shipment },
      },
      { status: 201 },
    );
  } catch (error) {
    // Tangani error validasi Zod, otorisasi, atau internal server error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal membuat shipment" },
      { status: 500 },
    );
  }
}

// Handler HTTP GET untuk mengambil daftar pengiriman florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId: floristId } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter filter dan paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const trackingNumber = searchParams.get("trackingNumber");

    // Susun filter query pengiriman florist
    const whereClause: any = {
      order: {
        items: {
          some: {
            product: {
              floristId: floristId,
            },
          },
        },
      },
    };

    if (status) whereClause.status = status;
    if (orderId) whereClause.orderId = orderId;
    if (trackingNumber)
      whereClause.trackingNumber = {
        contains: trackingNumber,
        mode: "insensitive",
      };

    // Ambil daftar pengiriman beserta relasi order dan data pembeli
    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Kembalikan respon sukses beserta data paginasi pengiriman
    return NextResponse.json({
      success: true,
      message: "Daftar shipment berhasil diambil",
      data: {
        shipments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar shipment" },
      { status: 500 },
    );
  }
}

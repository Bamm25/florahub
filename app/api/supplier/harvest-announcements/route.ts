import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const activeOnly = searchParams.get("activeOnly");

    const whereClause: any = {};

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    if (activeOnly === "true") {
      whereClause.isActive = true;
      // tampilkan panen yg belum lewat
      whereClause.harvestDate = {
        gte: new Date(),
      };
    }

    const announcements = await prisma.harvestAnnouncement.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            preOrders: true,
          },
        },
      },
      orderBy: {
        harvestDate: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pengumuman panen berhasil diambil",
      data: {
        total: announcements.length,
        announcements,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const body = await request.json();
    const {
      flowerName,
      variety,
      estimatedQuantity,
      pricePerUnit,
      harvestDate,
      description,
      location,
      image,
    } = body;

    if (
      !flowerName ||
      typeof flowerName !== "string" ||
      flowerName.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama bunga (flowerName) wajib diisi",
        },
        { status: 400 },
      );
    }

    if (typeof estimatedQuantity !== "number" || estimatedQuantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estimasi jumlah panen (estimatedQuantity) harus berupa angka positif lebih dari 0",
        },
        { status: 400 },
      );
    }

    if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Harga per unit (pricePerUnit) harus berupa angka positif lebih dari 0",
        },
        { status: 400 },
      );
    }

    if (!harvestDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal estimasi panen (harvestDate) wajib diisi",
        },
        { status: 400 },
      );
    }

    const parsedHarvestDate = new Date(harvestDate);
    if (isNaN(parsedHarvestDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format tanggal harvestDate tidak valid (gunakan format ISO 8601)",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    if (parsedHarvestDate < now) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal estimasi panen tidak boleh di masa lalu",
        },
        { status: 400 },
      );
    }

    const announcement = await prisma.harvestAnnouncement.create({
      data: {
        supplierId: userId,
        flowerName: flowerName.trim(),
        variety: variety ? variety.trim() : null,
        estimatedQuantity: Math.round(estimatedQuantity),
        pricePerUnit: Math.round(pricePerUnit),
        harvestDate: parsedHarvestDate,
        description: description ? description.trim() : null,
        location: location ? location.trim() : null,
        image: image ? image.trim() : null,
        isActive: true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pengumuman panen berhasil dibuat",
        data: { announcement },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

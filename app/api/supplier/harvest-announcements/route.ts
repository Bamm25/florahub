import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { createHarvestAnnouncementSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const activeOnly = searchParams.get("activeOnly");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
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

    const [announcements, total] = await Promise.all([
      prisma.harvestAnnouncement.findMany({
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
        skip,
        take: limit,
        orderBy: {
          harvestDate: "asc",
        },
      }),
      prisma.harvestAnnouncement.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Daftar pengumuman panen berhasil diambil",
      data: {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
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

    try {
      const body = await request.json();
      const validatedData = createHarvestAnnouncementSchema.parse(body);
      const {
        flowerName,
        variety,
        estimatedQuantity,
        pricePerUnit,
        harvestDate,
        description,
        location,
        image,
      } = validatedData;

      // Business logic validation: harvest date must be in the future
      const parsedHarvestDate = new Date(harvestDate);
      const now = new Date();
      if (parsedHarvestDate < now) {
        return NextResponse.json(
          {
            success: false,
            message: "Tanggal panen tidak boleh di masa lalu",
          },
          { status: 400 },
        );
      }

      const announcement = await prisma.harvestAnnouncement.create({
        data: {
          supplierId: userId,
          flowerName: flowerName.trim(),
          variety: variety?.trim() || null,
          estimatedQuantity,
          pricePerUnit,
          harvestDate: new Date(harvestDate),
          description: description?.trim() || null,
          location: location?.trim() || null,
          image: image?.trim() || null,
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
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }
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

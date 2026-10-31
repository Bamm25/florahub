import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateHarvestAnnouncementSchema } from "@/lib/validations/schemas";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: announcementId } = await params;

    const announcement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        preOrders: {
          include: {
            florist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail pengumuman panen berhasil diambil",
      data: { announcement },
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

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id: announcementId } = await params;
    const existingAnnouncement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "SUPPLIER" && existingAnnouncement.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak memiliki akses untuk mengubah pengumuman panen milik supplier lain",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = updateHarvestAnnouncementSchema.parse(body);
    const {
      flowerName,
      variety,
      estimatedQuantity,
      pricePerUnit,
      harvestDate,
      description,
      location,
      image,
      isActive,
    } = validated;

    let parsedHarvestDate = existingAnnouncement.harvestDate;
    if (harvestDate !== undefined) {
      parsedHarvestDate = new Date(harvestDate);
    }

    const updatedAnnouncement = await prisma.harvestAnnouncement.update({
      where: { id: announcementId },
      data: {
        flowerName:
          flowerName !== undefined
            ? flowerName.trim()
            : existingAnnouncement.flowerName,
        variety:
          variety !== undefined
            ? variety
              ? variety.trim()
              : null
            : existingAnnouncement.variety,
        estimatedQuantity:
          estimatedQuantity !== undefined
            ? Math.round(estimatedQuantity)
            : existingAnnouncement.estimatedQuantity,
        pricePerUnit:
          pricePerUnit !== undefined
            ? Math.round(pricePerUnit)
            : existingAnnouncement.pricePerUnit,
        harvestDate: parsedHarvestDate,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : existingAnnouncement.description,
        location:
          location !== undefined
            ? location
              ? location.trim()
              : null
            : existingAnnouncement.location,
        image:
          image !== undefined
            ? image
              ? image.trim()
              : null
            : existingAnnouncement.image,
        isActive:
          isActive !== undefined
            ? Boolean(isActive)
            : existingAnnouncement.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman panen berhasil diperbarui",
      data: {
        announcement: updatedAnnouncement,
      },
    });
  } catch (error) {
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
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "SUPPLIER",
      "ADMIN",
    ]);
    const { id: announcementId } = await params;
    const existingAnnouncement = await prisma.harvestAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumuman panen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "SUPPLIER" && existingAnnouncement.supplierId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak memiliki akses untuk mengubah pengumuman panen milik supplier lain",
        },
        { status: 403 },
      );
    }

    await prisma.harvestAnnouncement.delete({
      where: { id: announcementId },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman panen berhasil dihapus",
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

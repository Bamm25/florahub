import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// type RouteParams = {
//   id: Promise<{ id: string }>;
// };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    const inventory = await prisma.floristInventory.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        productComponents: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && inventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke inventory ini",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail inventory berhasil diambil",
      data: {
        inventory: {
          ...inventory,
          isLowStock: inventory.quantity < inventory.minThreshold,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail inventory" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;
    const body = await request.json();
    const { quantity, minThreshold, maxCapacity, location } = body;

    const existingInventory = await prisma.floristInventory.findUnique({
      where: { id },
    });

    if (!existingInventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && existingInventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses untuk mengubah inventory ini",
        },
        { status: 403 },
      );
    }

    const updateData: any = {};

    if (quantity !== undefined) updateData.quantity = quantity;
    if (minThreshold !== undefined) updateData.minThreshold = minThreshold;
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
    if (location !== undefined) updateData.location = location;

    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity harus lebih dari 0",
        },
        { status: 400 },
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada data yang diubah",
        },
        { status: 400 },
      );
    }

    if (quantity !== undefined) {
      updateData.lastRestockDate = new Date();
    }

    const inventory = await prisma.floristInventory.update({
      where: { id },
      data: updateData,
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Inventory berhasil diperbarui",
      data: {
        inventory: {
          ...inventory,
          isLowStock: inventory.quantity < inventory.minThreshold,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui inventory" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    const existingInventory = await prisma.floristInventory.findUnique({
      where: { id },
    });

    if (!existingInventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && existingInventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses untuk mengubah inventory ini",
        },
        { status: 403 },
      );
    }

    const componentsCount = await prisma.productComponent.count({
      where: {
        inventoryId: id,
      },
    });

    await prisma.floristInventory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message:
        componentsCount > 0
          ? `Inventory berhasil dihapus (${componentsCount} product components terkait juga dihapus)`
          : "Inventory berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus inventory" },
      { status: 500 },
    );
  }
}

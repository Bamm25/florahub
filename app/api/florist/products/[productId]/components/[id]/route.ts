import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateProductComponentSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string; id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { productId, id: componentId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        floristId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke produk ini",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateProductComponentSchema.parse(body);
    const { quantity } = validatedData;

    const existingComponent = await prisma.productComponent.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!existingComponent) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingComponent.productId !== productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen ini bukan milik produk ini",
        },
        { status: 400 },
      );
    }

    const component = await prisma.productComponent.update({
      where: { id: componentId },
      data: {
        quantity: quantity,
      },
      include: {
        inventory: {
          include: {
            stock: {
              select: {
                name: true,
                variety: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Komponen produk berhasil diperbarui",
      data: {
        component: {
          id: component.id,
          quantity: component.quantity,
          inventory: {
            id: component.inventory.id,
            currentStock: component.inventory.quantity,
            location: component.inventory.location,
            stock: component.inventory.stock,
          },
          createdAt: component.createdAt,
          updatedAt: component.updatedAt,
        },
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
      { success: false, message: "Gagal memperbarui komponen produk" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string; id: string }> },
) {
  try {
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { productId, id: componentId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        floristId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke produk ini",
        },
        { status: 403 },
      );
    }

    const existingComponent = await prisma.productComponent.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!existingComponent) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingComponent.productId !== productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen ini bukan milik produk ini",
        },
        { status: 400 },
      );
    }

    await prisma.productComponent.delete({
      where: { id: componentId },
    });

    return NextResponse.json({
      success: true,
      message: "Komponen produk berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus komponen produk" },
      { status: 500 },
    );
  }
}

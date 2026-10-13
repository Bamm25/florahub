import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string; id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    if (userRole !== "FLORIST" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk florist",
        },
        { status: 403 },
      );
    }

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
    const { quantity } = body;

    if (!quantity) {
      return NextResponse.json(
        {
          success: false,
          message: "Field quantity wajib diisi",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity harus lebih dari 0",
        },
        { status: 400 },
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
    console.error("Error memperbarui komponen produk:", error);
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }
    const userRole = (session.user as any)?.role;

    if (userRole !== "FLORIST" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk florist",
        },
        { status: 403 },
      );
    }

    const { productId, id: componentId } = await params;
    const userId = (session.user as any)?.id;

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
    console.error("Error menghapus komponen produk:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus komponen produk" },
      { status: 500 },
    );
  }
}

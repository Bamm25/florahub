import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
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

    const userId = (session.user as any)?.id;
    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
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

    const components = await prisma.productComponent.findMany({
      where: { productId },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar komponen produk berhasil diambil",
      data: {
        product: {
          id: product.id,
          name: product.name,
        },
        total: components.length,
        components: components.map((comp) => ({
          id: comp.id,
          quantity: comp.quantity,
          inventory: {
            id: comp.inventory.id,
            currentStock: comp.inventory.quantity,
            location: comp.inventory.location,
            stock: comp.inventory.stock,
          },
          createdAt: comp.createdAt,
          updatedAt: comp.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error mengambil komponen produk:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil komponen produk" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
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

    const userId = (session.user as any)?.id;
    const { productId } = await params;
    const body = await request.json();
    const { inventoryId, quantity } = body;

    if (!inventoryId || !quantity) {
      return NextResponse.json(
        {
          success: false,
          message: "Field inventoryId dan quantity wajib diisi",
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

    const inventory = await prisma.floristInventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        floristId: true,
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

    const existingComponent = await prisma.productComponent.findFirst({
      where: {
        productId,
        inventoryId,
      },
    });

    const component = await prisma.productComponent.create({
      data: {
        productId,
        inventoryId,
        quantity,
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

    return NextResponse.json(
      {
        success: true,
        message: "Komponen produk berhasil ditambahkan",
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
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error menambahkan komponen produk:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan komponen produk" },
      { status: 500 },
    );
  }
}

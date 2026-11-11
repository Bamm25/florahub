import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createProductComponentSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar komponen bahan baku penyusun produk
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID produk dari URL
    const { productId } = await params;

    // Cari data produk untuk memverifikasi kepemilikan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        floristId: true,
      },
    });

    // Validasi keberadaan data produk
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke produk ini",
        },
        { status: 403 },
      );
    }

    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Ambil daftar komponen produk beserta relasi inventaris dan stok supplier
    const [components, total] = await Promise.all([
      prisma.productComponent.findMany({
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
        take: limit,
        skip: skip,
      }),
      prisma.productComponent.count({ where: { productId } }),
    ]);

    // Kembalikan respon sukses beserta data paginasi komponen produk
    return NextResponse.json({
      success: true,
      message: "Daftar komponen produk berhasil diambil",
      data: {
        product: {
          id: product.id,
          name: product.name,
        },
        items: components.map((comp) => ({
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
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil komponen produk" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan komponen bahan baku baru ke resep produk
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID produk dari URL
    const { productId } = await params;
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validatedData = createProductComponentSchema.parse(body);
    const { inventoryId, quantity } = validatedData;

    // Cari data produk untuk memverifikasi kepemilikan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, floristId: true },
    });

    // Validasi keberadaan data produk
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke produk ini" },
        { status: 403 },
      );
    }

    // Cari data inventaris bahan baku florist
    const inventory = await prisma.floristInventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        floristId: true,
      },
    });

    // Validasi keberadaan data inventaris
    if (!inventory) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan inventaris oleh florist
    if (userRole === "FLORIST" && inventory.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki akses ke inventory ini",
        },
        { status: 403 },
      );
    }

    // Validasi kesesuaian pemilik produk dan pemilik inventaris bahan baku
    if (inventory.floristId !== product.floristId) {
      return NextResponse.json(
        { success: false, message: "Inventory bukan milik florist produk ini" },
        { status: 403 },
      );
    }

    // Periksa apakah komponen bahan baku sudah ada pada produk ini
    const existingComponent = await prisma.productComponent.findFirst({
      where: {
        productId,
        inventoryId,
      },
    });

    if (existingComponent) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen dengan inventory ini sudah ada di produk",
        },
        { status: 409 },
      );
    }

    // Simpan data komponen produk baru ke database
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

    // Kembalikan respon sukses pembuatan komponen produk
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
      { success: false, message: "Gagal menambahkan komponen produk" },
      { status: 500 },
    );
  }
}

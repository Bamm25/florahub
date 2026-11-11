import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateProductComponentSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP PUT untuk memperbarui kuantitas komponen bahan baku pada produk
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string; id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID produk dan ID komponen dari URL
    const { productId, id: componentId } = await params;

    // Cari data produk untuk memverifikasi kepemilikan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
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

    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validatedData = updateProductComponentSchema.parse(body);
    const { quantity } = validatedData;

    // Cari data komponen produk eksisting di database
    const existingComponent = await prisma.productComponent.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        productId: true,
      },
    });

    // Validasi keberadaan data komponen
    if (!existingComponent) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi relasi keterkaitan komponen dengan produk
    if (existingComponent.productId !== productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen ini bukan milik produk ini",
        },
        { status: 400 },
      );
    }

    // Perbarui kuantitas komponen produk di database
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

    // Kembalikan respon sukses pembaruan komponen produk
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
      { success: false, message: "Gagal memperbarui komponen produk" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus komponen bahan baku dari produk
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string; id: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    // Ambil parameter ID produk dan ID komponen dari URL
    const { productId, id: componentId } = await params;

    // Cari data produk untuk memverifikasi kepemilikan
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
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

    // Cari data komponen produk eksisting di database
    const existingComponent = await prisma.productComponent.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        productId: true,
      },
    });

    // Validasi keberadaan data komponen
    if (!existingComponent) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi relasi keterkaitan komponen dengan produk
    if (existingComponent.productId !== productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Komponen ini bukan milik produk ini",
        },
        { status: 400 },
      );
    }

    // Hapus data komponen produk dari database
    await prisma.productComponent.delete({
      where: { id: componentId },
    });

    // Kembalikan respon sukses penghapusan komponen produk
    return NextResponse.json({
      success: true,
      message: "Komponen produk berhasil dihapus",
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal menghapus komponen produk" },
      { status: 500 },
    );
  }
}

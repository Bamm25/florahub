import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateProductSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil detail produk berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Cari produk beserta data kategori dan informasi florist
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    // Kembalikan detail data produk
    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data produk",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data produk
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi otentikasi peran florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    // Periksa keberadaan produk sebelum diperbarui
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk bagi peran florist
    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin mengedit produk ini",
        },
        { status: 403 },
      );
    }

    try {
      // Parse dan validasi data pembaruan produk
      const body = await request.json();
      const validatedData = updateProductSchema.parse(body);
      const { name, description, price, stock, image } = validatedData;

    // Perbarui data produk pada database
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        image,
      },
      include: {
        category: true,
        florist: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Kembalikan data produk yang berhasil diperbarui
    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updatedProduct,
    });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: "Validation error", errors: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui produk" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus produk berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi otentikasi peran florist atau admin
    const { userId, userRole } = await requireAuth(request, [
      "FLORIST",
      "ADMIN",
    ]);
    const { id } = await params;

    // Periksa keberadaan produk sebelum dihapus
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk bagi peran florist
    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin menghapus produk ini",
        },
        { status: 403 },
      );
    }

    // Hapus produk dari database
    await prisma.product.delete({
      where: { id },
    });

    // Kembalikan respons berhasil penghapusan produk
    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menghapus produk",
      },
      { status: 500 },
    );
  }
}

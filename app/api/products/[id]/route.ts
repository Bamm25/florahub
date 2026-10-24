import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

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
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin mengedit produk ini",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, description, price, stock, image } = body;

    if (!name || !price || !stock || !image) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Field wajib tidak lengkap (name, price, stock, image harus diisi)",
        },
        { status: 400 },
      );
    }

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

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updatedProduct,
    });
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

    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin menghapus produk ini",
        },
        { status: 403 },
      );
    }

    await prisma.product.delete({
      where: { id },
    });

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

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateCategorySchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil detail kategori bunga berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Cari kategori bunga beserta jumlah produk terkait
    const category = await prisma.flowerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori bunga tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Kembalikan detail data kategori bunga
    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menampilkan detail kategori",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data kategori bunga
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi otentikasi peran admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id } = await params;

    // Pastikan kategori bunga yang akan diperbarui ada di database
    const existingCategory = await prisma.flowerCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori bunga tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Parse dan validasi payload pembaruan kategori
    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);
    const { name, description, slug } = validatedData;

    // Validasi keunikan nama kategori jika diubah
    if (name) {
      const duplicateCategory = await prisma.flowerCategory.findFirst({
        where: {
          name: name.trim(),
          NOT: { id },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          {
            success: false,
            message: "Nama kategori sudah terdaftar",
          },
          { status: 409 },
        );
      }
    }

    // Perbarui data kategori bunga di database
    const updateCategory = await prisma.flowerCategory.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingCategory.name,
        slug: slug !== undefined ? slug : existingCategory.slug,
        description:
          description !== undefined
            ? description
            : existingCategory.description,
      },
    });

    // Kembalikan respons berhasil pembaruan kategori
    return NextResponse.json({
      success: true,
      data: updateCategory,
      message: "Kategori bunga berhasil diperbarui",
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
        message: "Gagal memperbarui kategori bunga",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus kategori bunga berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi otentikasi peran admin
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id } = await params;

    // Periksa keberadaan kategori dan relasi produk terkait
    const category = await prisma.flowerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori bunga tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Cegah penghapusan jika kategori masih digunakan oleh produk
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Kategori tidak bisa dihapus karena masih digunakan oleh ${category._count.products} produk`,
        },
        { status: 409 },
      );
    }

    // Hapus kategori bunga dari basis data
    await prisma.flowerCategory.delete({
      where: { id },
    });

    // Kirim respons berhasil penghapusan kategori
    return NextResponse.json({
      success: true,
      message: "Kategori bunga berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menghapus kategori bunga",
      },
      { status: 500 },
    );
  }
}

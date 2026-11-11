import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        productComponents: {
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
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (userRole === "FLORIST" && product.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke produk ini",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail produk berhasil diambil",
      data: product,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail produk" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { productId } = await params;

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin mengedit produk ini",
        },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request body tidak valid (harus JSON)" },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      price,
      stock,
      image,
      images,
      categoryId,
      weight,
      tags,
      isActive,
      isFeatured,
    } = body || {};

    const updateData: any = {};

    // Use the same strict data types as POST; coercion silently changes stock and flags.
    if ((price !== undefined && (typeof price !== "number" || !Number.isSafeInteger(price) || price < 0)) ||
        (stock !== undefined && (typeof stock !== "number" || !Number.isSafeInteger(stock) || stock < 0)) ||
        (weight !== undefined && weight !== null && (typeof weight !== "number" || !Number.isSafeInteger(weight) || weight < 0)) ||
        (isActive !== undefined && typeof isActive !== "boolean") ||
        (isFeatured !== undefined && typeof isFeatured !== "boolean") ||
        (tags !== undefined && (!Array.isArray(tags) || !tags.every((tag: unknown) => typeof tag === "string"))) ||
        (description !== undefined && description !== null && typeof description !== "string") ||
        (images !== undefined && (!Array.isArray(images) || !images.every((url: unknown) => typeof url === "string")))) {
      return NextResponse.json({ success: false, message: "Data produk tidak valid" }, { status: 400 });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { success: false, message: "Nama produk tidak boleh kosong" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json(
          { success: false, message: "Harga produk harus berupa angka valid dan tidak boleh negatif" },
          { status: 400 }
        );
      }
      updateData.price = price;
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        return NextResponse.json(
          { success: false, message: "Stok produk harus berupa angka valid dan tidak boleh negatif" },
          { status: 400 }
        );
      }
      updateData.stock = stock;
    }

    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || !categoryId.trim()) {
        return NextResponse.json(
          { success: false, message: "Kategori wajib dipilih" },
          { status: 400 }
        );
      }
      const category = await prisma.flowerCategory.findUnique({
        where: { id: categoryId.trim() },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Kategori tidak ditemukan" },
          { status: 404 }
        );
      }
      updateData.categoryId = categoryId.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string" || !image.trim()) {
        return NextResponse.json(
          { success: false, message: "Gambar produk wajib diunggah" },
          { status: 400 }
        );
      }
      const trimmedImage = image.trim();
      const isValidUrl =
        trimmedImage.startsWith("http://") ||
        trimmedImage.startsWith("https://") ||
        trimmedImage.startsWith("/uploads/");
      if (!isValidUrl) {
        return NextResponse.json(
          { success: false, message: "URL gambar tidak valid" },
          { status: 400 }
        );
      }
      updateData.image = trimmedImage;
      if (!images) {
        updateData.images = [trimmedImage];
      }
    }

    if (images !== undefined && Array.isArray(images)) {
      updateData.images = images;
    }

    if (description !== undefined) {
      updateData.description =
        description && typeof description === "string" ? description.trim() : null;
    }

    if (weight !== undefined) {
      updateData.weight = weight;
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim()).filter(Boolean)
        : [];
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        florist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
    console.error("Error updating florist product:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui produk florist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId, userRole } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { productId } = await params;

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    if (userRole === "FLORIST" && existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin menghapus produk ini",
        },
        { status: 403 }
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus",
      data: { id: productId },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error deleting florist product:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus produk florist" },
      { status: 500 }
    );
  }
}

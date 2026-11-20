import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { safeRevalidatePaths } from "@/lib/revalidate-safe";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil detail data produk florist berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID produk dari URL
    const { productId } = await params;

    // Cari data produk beserta kategori, florist, dan komponen bahan baku
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
    if (product.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke produk ini",
        },
        { status: 403 },
      );
    }

    // Kembalikan respon sukses data detail produk
    return NextResponse.json({
      success: true,
      message: "Detail produk berhasil diambil",
      data: product,
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail produk" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui data produk florist berdasarkan ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID produk dari URL
    const { productId } = await params;

    // Cari data produk eksisting di database
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    // Validasi keberadaan data produk
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin mengedit produk ini",
        },
        { status: 403 },
      );
    }

    // Parsing dan validasi format JSON request body
    let body: Record<string, unknown>;
    try {
      const parsedBody: unknown = await request.json();
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        return NextResponse.json(
          { success: false, message: "Format request body tidak valid (harus objek JSON)" },
          { status: 400 },
        );
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format request body tidak valid (harus JSON)",
        },
        { status: 400 },
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
    } = body;

    const updateData: Prisma.ProductUncheckedUpdateInput = {};

    // Validasi kesesuaian tipe data nilai pembaruan
    if (
      (price !== undefined &&
        (typeof price !== "number" ||
          !Number.isSafeInteger(price) ||
          price < 0)) ||
      (stock !== undefined &&
        (typeof stock !== "number" ||
          !Number.isSafeInteger(stock) ||
          stock < 0)) ||
      (weight !== undefined &&
        weight !== null &&
        (typeof weight !== "number" ||
          !Number.isSafeInteger(weight) ||
          weight < 0)) ||
      (isActive !== undefined && typeof isActive !== "boolean") ||
      (isFeatured !== undefined && typeof isFeatured !== "boolean") ||
      (tags !== undefined &&
        (!Array.isArray(tags) ||
          !tags.every((tag: unknown) => typeof tag === "string"))) ||
      (description !== undefined &&
        description !== null &&
        typeof description !== "string") ||
      (images !== undefined &&
        (!Array.isArray(images) ||
          !images.every((url: unknown) => typeof url === "string")))
    ) {
      return NextResponse.json(
        { success: false, message: "Data produk tidak valid" },
        { status: 400 },
      );
    }

    // Validasi nama produk jika diperbarui
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { success: false, message: "Nama produk tidak boleh kosong" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    // Validasi harga produk jika diperbarui
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Harga produk harus berupa angka valid dan tidak boleh negatif",
          },
          { status: 400 },
        );
      }
      updateData.price = price;
    }

    // Validasi stok produk jika diperbarui
    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stok produk harus berupa angka valid dan tidak boleh negatif",
          },
          { status: 400 },
        );
      }
      updateData.stock = stock;
    }

    // Validasi kategori produk jika diperbarui
    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || !categoryId.trim()) {
        return NextResponse.json(
          { success: false, message: "Kategori wajib dipilih" },
          { status: 400 },
        );
      }
      const category = await prisma.flowerCategory.findUnique({
        where: { id: categoryId.trim() },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Kategori tidak ditemukan" },
          { status: 404 },
        );
      }
      updateData.categoryId = categoryId.trim();
    }

    // Validasi URL gambar produk agar hanya menerima URL HTTPS aman (atau R2 terkonfigurasi)
    const isSafeImageUrl = (raw: string): boolean => {
      try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "https:") return false;
        const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");
        if (r2PublicUrl) {
          return raw.startsWith(`${r2PublicUrl}/`);
        }
        return true;
      } catch {
        return false;
      }
    };

    if (image !== undefined) {
      if (typeof image !== "string" || !image.trim()) {
        return NextResponse.json(
          { success: false, message: "Gambar produk wajib diunggah" },
          { status: 400 },
        );
      }
      const trimmedImage = image.trim();
      if (!isSafeImageUrl(trimmedImage)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "URL gambar harus menggunakan HTTPS dari storage resmi produk",
          },
          { status: 400 },
        );
      }
      updateData.image = trimmedImage;
      if (!images) {
        updateData.images = [trimmedImage];
      }
    }

    // Validasi daftar gambar tambahan jika disertakan
    if (images !== undefined && Array.isArray(images)) {
      const cleanedImages = images.map((url: string) => url.trim()).filter(Boolean);
      if (!cleanedImages.every(isSafeImageUrl)) {
        return NextResponse.json(
          {
            success: false,
            message: "Semua URL gambar tambahan harus menggunakan HTTPS yang valid",
          },
          { status: 400 },
        );
      }
      updateData.images = cleanedImages;
    }

    // Format deskripsi produk jika ada
    if (description !== undefined) {
      updateData.description =
        description && typeof description === "string"
          ? description.trim()
          : null;
    }

    // Format berat produk jika ada
    if (weight !== undefined) {
      updateData.weight = weight;
    }

    // Format tag produk jika ada
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? tags.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [];
    }

    // Format status keaktifan produk
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Format status produk unggulan
    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured;
    }

    // Perbarui data produk di database
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

    safeRevalidatePaths(["/", "/products", "/stores", `/stores/${userId}`]);

    // Kembalikan respon sukses pembaruan produk
    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updatedProduct,
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Error updating florist product:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui produk florist" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus produk florist berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter ID produk dari URL
    const { productId } = await params;

    // Cari data produk eksisting di database
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    // Validasi keberadaan data produk
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan produk oleh florist
    if (existingProduct.floristId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin menghapus produk ini",
        },
        { status: 403 },
      );
    }

    // Hapus data produk dari database
    await prisma.product.delete({
      where: { id: productId },
    });

    safeRevalidatePaths(["/", "/products", "/stores", `/stores/${userId}`]);

    // Kembalikan respon sukses penghapusan produk
    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus",
      data: { id: productId },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Error deleting florist product:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus produk florist" },
      { status: 500 },
    );
  }
}

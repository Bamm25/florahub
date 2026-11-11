import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

// Handler HTTP GET untuk mengambil daftar katalog produk florist
export async function GET(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);
    // Ambil parameter paginasi dari query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause = { floristId: userId };

    // Ambil daftar produk beserta relasi kategori, komponen bahan baku, dan total data
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ]);

    // Kembalikan respon sukses beserta data paginasi produk
    return NextResponse.json({
      success: true,
      message: "Daftar produk florist berhasil diambil",
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data produk" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan produk baru florist
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist
    const { userId } = await requireAuth(request, ["FLORIST"]);

    // Parsing dan validasi format JSON request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request body tidak valid (harus JSON)" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Data produk harus berupa objek JSON" },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      price,
      stock,
      image,
      categoryId,
      weight,
      tags,
      isActive,
      isFeatured,
    } = body as Record<string, unknown>;

    // Validasi nama produk
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama produk wajib diisi" },
        { status: 400 },
      );
    }

    // Validasi nominal harga produk
    if (typeof price !== "number" || !Number.isSafeInteger(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: "Harga produk harus berupa bilangan bulat tidak negatif" },
        { status: 400 },
      );
    }

    // Validasi kuantitas stok produk
    if (typeof stock !== "number" || !Number.isSafeInteger(stock) || stock < 0) {
      return NextResponse.json(
        { success: false, message: "Stok produk harus berupa bilangan bulat tidak negatif" },
        { status: 400 },
      );
    }

    // Validasi ID kategori produk
    if (!categoryId || typeof categoryId !== "string" || !categoryId.trim()) {
      return NextResponse.json(
        { success: false, message: "Kategori wajib dipilih" },
        { status: 400 },
      );
    }

    // Cari dan periksa keberadaan kategori bunga di database
    const category = await prisma.flowerCategory.findUnique({
      where: { id: categoryId.trim() },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Kategori bunga tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi tipe dan rentang nilai opsional produk
    const validWeight = weight == null || (typeof weight === "number" && Number.isSafeInteger(weight) && weight >= 0);
    const validTags = tags === undefined || (Array.isArray(tags) && tags.every((tag: unknown) => typeof tag === "string"));
    if (name.trim().length > 200 || !validWeight || !validTags ||
        (isActive !== undefined && typeof isActive !== "boolean") ||
        (isFeatured !== undefined && typeof isFeatured !== "boolean")) {
      return NextResponse.json(
        { success: false, message: "Data produk tidak valid" },
        { status: 400 },
      );
    }

    // Validasi keberadaan URL gambar produk
    if (!image || typeof image !== "string" || !image.trim()) {
      return NextResponse.json(
        { success: false, message: "Gambar produk wajib diunggah terlebih dahulu" },
        { status: 400 },
      );
    }

    // Validasi domain publik penyimpanan gambar Cloudflare R2
    const trimmedImage = image.trim();
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!publicBase || !trimmedImage.startsWith(`${publicBase}/products/`)) {
      return NextResponse.json(
        { success: false, message: "Gambar harus diunggah ke Cloudflare R2 terlebih dahulu" },
        { status: 400 },
      );
    }

    // Verifikasi ketersediaan dan tipe konten file gambar di Cloudflare R2
    try {
      const uploaded = await fetch(trimmedImage, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (!uploaded.ok || !uploaded.headers.get("content-type")?.startsWith("image/")) {
        return NextResponse.json(
          { success: false, message: "Gambar tidak tersedia di Cloudflare R2" },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error("R2 image verification failed:", error);
      return NextResponse.json(
        { success: false, message: "Tidak dapat memverifikasi gambar di Cloudflare R2" },
        { status: 503 },
      );
    }

    // Buat slug unik produk dengan pengidentifikasi acak
    let baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = `product-${Date.now()}`;
    }

    const slug = `${baseSlug.slice(0, 112)}-${randomUUID()}`;

    // Format nilai field opsional produk
    const trimmedDesc =
      description === null || description === undefined
        ? null
        : typeof description === "string" ? description.trim() : undefined;
    if (trimmedDesc === undefined) {
      return NextResponse.json(
        { success: false, message: "Deskripsi produk tidak valid" },
        { status: 400 },
      );
    }
    const numWeight = weight == null ? null : weight as number;

    const tagsArray = (tags as string[] | undefined)?.map((tag) => tag.trim()).filter(Boolean) ?? [];

    const active = typeof isActive === "boolean" ? isActive : true;
    const featured = typeof isFeatured === "boolean" ? isFeatured : false;
    const imagesArray = [trimmedImage];

    // Simpan data produk baru ke database
    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        description: trimmedDesc,
        price,
        stock,
        image: trimmedImage,
        images: imagesArray,
        categoryId: categoryId.trim(),
        floristId: userId,
        isActive: active,
        isFeatured: featured,
        tags: tagsArray,
        weight: numWeight,
      },
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

    // Kembalikan respon sukses pembuatan produk
    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan",
        data: newProduct,
      },
      { status: 201 },
    );
  } catch (error) {
    // Tangani error otorisasi atau internal server error
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error creating florist product:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan produk florist" },
      { status: 500 },
    );
  }
}

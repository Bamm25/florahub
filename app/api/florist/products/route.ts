import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause = { floristId: userId };

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
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data produk" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST"]);

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

    // 1. Validasi name
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama produk wajib diisi" },
        { status: 400 },
      );
    }

    // 2. Validasi price
    if (typeof price !== "number" || !Number.isSafeInteger(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: "Harga produk harus berupa bilangan bulat tidak negatif" },
        { status: 400 },
      );
    }

    // 3. Validasi stock
    if (typeof stock !== "number" || !Number.isSafeInteger(stock) || stock < 0) {
      return NextResponse.json(
        { success: false, message: "Stok produk harus berupa bilangan bulat tidak negatif" },
        { status: 400 },
      );
    }

    // 4. Validasi categoryId
    if (!categoryId || typeof categoryId !== "string" || !categoryId.trim()) {
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
        { success: false, message: "Kategori bunga tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validate optional values before any storage or database operation.
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

    // 5. Validasi file upload sukses sebelum create product record
    if (!image || typeof image !== "string" || !image.trim()) {
      return NextResponse.json(
        { success: false, message: "Gambar produk wajib diunggah terlebih dahulu" },
        { status: 400 },
      );
    }

    const trimmedImage = image.trim();
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!publicBase || !trimmedImage.startsWith(`${publicBase}/products/`)) {
      return NextResponse.json(
        { success: false, message: "Gambar harus diunggah ke Cloudflare R2 terlebih dahulu" },
        { status: 400 },
      );
    }

    // A URL alone does not prove that the upload completed successfully.
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

    // 6. Generate unique slug
    let baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = `product-${Date.now()}`;
    }

    // UUID suffix avoids racing a read-before-write uniqueness check.
    const slug = `${baseSlug.slice(0, 112)}-${randomUUID()}`;

    // Format optional fields
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

    // Create product di database
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

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan",
        data: newProduct,
      },
      { status: 201 },
    );
  } catch (error) {
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

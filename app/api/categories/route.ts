import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { isPrismaUniqueError } from "@/lib/prisma-errors";
import { reportServerError } from "@/lib/server-error-report";
import {
  adminCategoryQuerySchema,
  createCategorySchema,
} from "@/lib/validations/schemas";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar kategori bunga beserta filter dan paginasi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIsActive = searchParams.get("isActive")?.trim();
    const rawSearch = searchParams.get("search")?.trim();

    const parsed = adminCategoryQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      isActive: rawIsActive || undefined,
      search: rawSearch || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Filter kategori tidak valid" },
        { status: 400 },
      );
    }

    const { page, limit, isActive, search } = parsed.data;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FlowerCategoryWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [categories, total] = await Promise.all([
      prisma.flowerCategory.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        take: limit,
        skip,
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      prisma.flowerCategory.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: categories,
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
    reportServerError("Category list fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data kategori" },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk membuat kategori bunga baru oleh admin secara atomik
export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);

    const body: unknown = await request.json().catch(() => null);
    const validatedData = createCategorySchema.parse(body);
    const { name, slug, description, image, isActive } = validatedData;
    const normalizedName = name.trim();
    const normalizedSlug = slug.trim();

    const result = await prisma.$transaction(async (tx) => {
      const existingCategory = await tx.flowerCategory.findFirst({
        where: {
          OR: [{ name: normalizedName }, { slug: normalizedSlug }],
        },
        select: { id: true, name: true, slug: true },
      });

      if (existingCategory) {
        return {
          status: 409 as const,
          message:
            existingCategory.name === normalizedName
              ? "Kategori dengan nama tersebut sudah ada"
              : "Slug kategori tersebut sudah digunakan",
        };
      }

      const newCategory = await tx.flowerCategory.create({
        data: {
          name: normalizedName,
          slug: normalizedSlug,
          description: description ? description.trim() : null,
          image: image || null,
          isActive,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "FlowerCategory",
          entityId: newCategory.id,
          newValue: {
            name: newCategory.name,
            slug: newCategory.slug,
            isActive: newCategory.isActive,
          },
        },
      });

      return { status: 201 as const, category: newCategory };
    });

    if (result.status === 409) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.category,
        message: "Kategori berhasil ditambahkan",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { success: false, message: "Nama atau slug kategori sudah terdaftar" },
        { status: 409 },
      );
    }
    reportServerError("Category creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan kategori bunga" },
      { status: 500 },
    );
  }
}

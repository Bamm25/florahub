import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCategorySchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      prisma.flowerCategory.findMany({
        orderBy: {
          name: "asc",
        },
        take: limit,
        skip: skip,
      }),
      prisma.flowerCategory.count(),
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
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data kategori",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);
    const { name, slug, description } = validatedData;

    // Business logic validation: unique name check
    const existingCategory = await prisma.flowerCategory.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori dengan nama tersebut sudah ada",
        },
        { status: 409 },
      );
    }

    const newCategory = await prisma.flowerCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newCategory,
        message: "Kategori berhasil ditambahkan",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menambahkan kategori bunga",
      },
      { status: 500 },
    );
  }
}

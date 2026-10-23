import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.flowerCategory.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
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
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kategori wajib diisi",
        },
        { status: 400 },
      );
    }

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
        slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
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

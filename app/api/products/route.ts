import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
    return NextResponse.json({
      success: true,
      data: products,
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
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const body = await request.json();
    const { name, description, price, stock, image, categoryId } = body;
    if (!name || !price || !stock || !image || !categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Field wajib tidak lengkap (name, price, stock, image, categoryId harus diisi)",
        },
        {
          status: 400,
        },
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description: description,
        price: price,
        stock: stock,
        image: image,
        categoryId: categoryId,
        floristId: userId,
        isActive: true,
      },
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

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil dibuat",
        data: newProduct,
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
        message: "Gagal membuat produk",
      },
      { status: 500 },
    );
  }
}

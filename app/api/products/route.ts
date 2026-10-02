import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
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
    console.error("error fetching products", error);
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
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { name, description, price, stock, image, categoryId } = body;

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak terautentikasi: Silakan login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    const userRole = (session.user as any)?.role;

    if (
      userRole !== "FLORIST" &&
      userRole !== "SUPPLIER" &&
      userRole !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki izin untuk membuat produk",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;

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
        slug: name.toLowerCase().replace(/\s+/g, '-'),
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
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat produk",
      },
      { status: 500 },
    );
  }
}

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const whereClause: any = {
      isActive: true,
    };
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
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
      message: "Daftar produk berhasil diambil",
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

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
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
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk supplier",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any)?.id;
    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where: { supplierId: userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stock.count({
        where: { supplierId: userId },
      }),
    ]);

    const lowStockCount = stocks.filter((stock) => stock.quantity < 50).length;

    return NextResponse.json({
      success: true,
      message: "Daftar stock berhasil diambil",
      data: {
        total,
        lowStockCount,
        stocks,
      },
    });
  } catch (error) {
    console.error("Error mengambil stok:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data stok" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
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
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Endpoint ini khusus untuk supplier",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      variety,
      quantity,
      unit,
      pricePerUnit,
      harvestDate,
      expiryDate,
      location,
      isAvailable,
    } = body;

    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Nama bunga wajib diisi dan harus berupa teks",
        },
        { status: 400 },
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { success: false, message: "Jumlah stok harus berupa angka positif" },
        { status: 400 },
      );
    }

    if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Harga per unit harus berupa angka positif",
        },
        { status: 400 },
      );
    }

    const userId = (session.user as any)?.id;

    const newStock = await prisma.stock.create({
      data: {
        supplierId: userId,
        name: name.trim(),
        variety: variety?.trim() || null,
        quantity,
        unit: unit?.trim() || "tangkai",
        pricePerUnit,
        harvestDate: harvestDate ? new Date(harvestDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        location: location?.trim() || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stok bunga berhasil ditambahkan",
        data: newStock,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error menambah stok:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambah stok bunga" },
      { status: 500 },
    );
  }
}

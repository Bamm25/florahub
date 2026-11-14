import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Skema validasi pembuatan bahan baku mandiri oleh florist
const createRawMaterialSchema = z.object({
  name: z.string().min(2, "Nama bahan baku minimal 2 karakter"),
  category: z.string().default("Bunga Segar"),
  variety: z.string().optional().nullable(),
  quantity: z.number().int().min(0, "Stok awal tidak boleh negatif"),
  unit: z.string().default("tangkai"),
  pricePerUnit: z.number().int().min(0, "Harga modal per unit tidak boleh negatif"),
  minThreshold: z.number().int().min(0).default(10),
  location: z.string().optional().nullable(),
});

// Handler HTTP GET untuk mengambil daftar bahan baku produk mentah florist
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "ALL";

    // Query inventory florist beserta data stock dan produk BOM yang menggunakannya
    const inventories = await prisma.floristInventory.findMany({
      where: {
        floristId: userId,
        ...(search
          ? {
              stock: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { variety: { contains: search, mode: "insensitive" } },
                ],
              },
            }
          : {}),
        ...(category !== "ALL"
          ? {
              stock: {
                variety: { equals: category, mode: "insensitive" },
              },
            }
          : {}),
      },
      include: {
        stock: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        productComponents: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Petakan data bahan baku dengan status keterkaitan BOM dan sumber pengadaan
    const rawMaterials = inventories.map((inv) => {
      const isSelfSupplied = inv.stock.supplierId === userId;
      const isLowStock = inv.quantity < inv.minThreshold;
      const isOutOfStock = inv.quantity <= 0;

      return {
        id: inv.id,
        stockId: inv.stockId,
        name: inv.stock.name,
        category: inv.stock.variety || "Umum",
        variety: inv.stock.variety,
        quantity: inv.quantity,
        unit: inv.stock.unit,
        pricePerUnit: inv.stock.pricePerUnit,
        minThreshold: inv.minThreshold,
        location: inv.location || inv.stock.location || "-",
        lastRestockDate: inv.lastRestockDate,
        createdAt: inv.createdAt,
        isSelfSupplied,
        sourceLabel: isSelfSupplied ? "Stok Mandiri" : "Supplier Panen",
        supplierName: inv.stock.supplier?.name || "Mandiri",
        isLowStock,
        isOutOfStock,
        usedInBOMCount: inv.productComponents.length,
        usedInProducts: inv.productComponents.map((pc) => ({
          id: pc.product.id,
          name: pc.product.name,
          image: pc.product.image,
          quantityRequired: pc.quantity,
        })),
      };
    });

    // Hitung ringkasan metrik statistik bahan baku
    const totalItems = rawMaterials.length;
    const totalStock = rawMaterials.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = rawMaterials.filter((item) => item.isLowStock).length;
    const usedInBOMCount = rawMaterials.filter((item) => item.usedInBOMCount > 0).length;

    return NextResponse.json({
      success: true,
      message: "Daftar bahan baku produk mentah berhasil diambil",
      data: {
        rawMaterials,
        stats: {
          totalItems,
          totalStock,
          lowStockCount,
          usedInBOMCount,
        },
      },
    });
  } catch (error: any) {
    reportServerError("[GET_RAW_MATERIALS_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil daftar bahan baku",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan bahan baku baru secara mandiri
export async function POST(request: Request) {
  try {
    // Autentikasi dan verifikasi hak akses florist atau admin
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);
    // Parsing dan validasi request body menggunakan skema Zod
    const body = await request.json();
    const validated = createRawMaterialSchema.parse(body);

    const {
      name,
      category,
      variety,
      quantity,
      unit,
      pricePerUnit,
      minThreshold,
      location,
    } = validated;

    // Buat data stok dan inventaris florist dalam transaksi database atomic
    const result = await prisma.$transaction(async (tx) => {
      // Buat data stok bahan baku dengan kepemilikan florist sendiri
      const stock = await tx.stock.create({
        data: {
          supplierId: userId,
          name: name.trim(),
          variety: (variety?.trim() || category).trim(),
          quantity: quantity,
          unit: unit.trim().toLowerCase(),
          pricePerUnit: pricePerUnit,
          harvestDate: new Date(),
          location: location?.trim() || null,
          isAvailable: true,
        },
      });

      // Hubungkan langsung ke inventori florist agar siap dipakai di BOM produk
      const inventory = await tx.floristInventory.create({
        data: {
          floristId: userId,
          stockId: stock.id,
          quantity: quantity,
          minThreshold: minThreshold,
          location: location?.trim() || null,
          lastRestockDate: new Date(),
        },
        include: {
          stock: true,
        },
      });

      return { stock, inventory };
    });

    return NextResponse.json(
      {
        success: true,
        message: `Bahan baku "${result.stock.name}" berhasil ditambahkan dan siap digunakan pada BOM`,
        data: {
          inventoryId: result.inventory.id,
          stockId: result.stock.id,
          name: result.stock.name,
          quantity: result.inventory.quantity,
          unit: result.stock.unit,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    reportServerError("[POST_RAW_MATERIALS_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Validasi form gagal",
          errors: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menambahkan bahan baku",
      },
      { status: 500 },
    );
  }
}

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { createAddressSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP GET untuk mengambil daftar alamat pelanggan dengan paginasi
export async function GET(request: Request) {
  try {
    // Validasi sesi pengguna dan parameter paginasi
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Ambil data alamat dengan mendahulukan alamat utama
    const [addresses, total] = await Promise.all([
      prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: skip,
      }),
      prisma.address.count({ where: { userId } }),
    ]);

    // Kirim respons daftar alamat beserta metadata paginasi
    return NextResponse.json({
      success: true,
      message: "Daftar alamat berhasil diambil",
      data: {
        items: addresses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof Response || error instanceof NextResponse) {
      return error;
    }
    console.error("[GET /api/customer/addresses error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP POST untuk menambahkan alamat baru pelanggan
export async function POST(request: Request) {
  try {
    // Validasi sesi pengguna dan muatan permintaan pembuatan alamat
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const body = await request.json();
    const validatedData = createAddressSchema.parse(body);
    const {
      label,
      recipientName,
      phone,
      fullAddress,
      city,
      province,
      postalCode,
      latitude,
      longitude,
      isDefault,
    } = validatedData;

    // Periksa jumlah alamat yang sudah tersimpan
    const existingAddressCount = await prisma.address.count({
      where: { userId },
    });

    // Tetapkan sebagai alamat utama jika belum ada alamat lain
    const shouldBeDefault =
      existingAddressCount === 0 ? true : Boolean(isDefault);

    // Nonaktifkan status utama pada alamat lain jika alamat baru dijadikan utama
    if (shouldBeDefault && existingAddressCount > 0) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Simpan data alamat baru ke database
    const newAddress = await prisma.address.create({
      data: {
        userId,
        label,
        recipientName,
        phone,
        fullAddress,
        city,
        province,
        postalCode,
        latitude: latitude || null,
        longitude: longitude || null,
        isDefault: shouldBeDefault,
      },
    });

    // Kirim respons sukses beserta data alamat yang dibuat
    return NextResponse.json(
      {
        success: true,
        message: "Alamat berhasil ditambahkan",
        data: { address: newAddress },
      },
      { status: 201 },
    );
  } catch (error) {
    // Tangani galat otentikasi pengguna
    if (error instanceof Response || error instanceof NextResponse) {
      return error;
    }
    // Tangani kesalahan validasi skema input
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    console.error("[POST /api/customer/addresses error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { createAddressSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// GET: Fetch semua addresses customer dengan pagination
export async function GET(request: Request) {
  try {
    // Validate user session dan parse pagination params
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Query addresses dengan default first ordering
    const [addresses, total] = await Promise.all([
      prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: skip,
      }),
      prisma.address.count({ where: { userId } }),
    ]);

    // Return response dengan pagination metadata
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
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// POST: Create new address untuk customer
export async function POST(request: Request) {
  try {
    // Validate user session dan parse request body
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

    // Check existing addresses count
    const existingAddressCount = await prisma.address.count({
      where: { userId },
    });

    // First address harus default
    const shouldBeDefault =
      existingAddressCount === 0 ? true : Boolean(isDefault);

    // Unset default dari addresses lain jika ini default
    if (shouldBeDefault && existingAddressCount > 0) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Create new address
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

    // Return response dengan new address data
    return NextResponse.json(
      {
        success: true,
        message: "Alamat berhasil ditambahkan",
        data: { address: newAddress },
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        { status: 400 },
      );
    }
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

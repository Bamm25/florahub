import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { createAddressSchema } from "@/lib/validations/schemas";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [addresses, total] = await Promise.all([
      prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: skip,
      }),
      prisma.address.count({ where: { userId } }),
    ]);

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

export async function POST(request: Request) {
  try {
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

    const existingAddressCount = await prisma.address.count({
      where: { userId },
    });

    const shouldBeDefault =
      existingAddressCount === 0 ? true : Boolean(isDefault);

    if (shouldBeDefault && existingAddressCount > 0) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

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

    return NextResponse.json(
      {
        success: true,
        message: "Alamat berhasil ditambahkan",
        data: { address: newAddress },
      },
      { status: 201 },
    );
  } catch (error) {
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

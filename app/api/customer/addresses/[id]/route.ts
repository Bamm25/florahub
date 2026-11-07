import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateAddressSchema } from "@/lib/validations/schemas";
import { z } from "zod";

type RouteParms = { params: Promise<{ id: string }> };

// GET: Fetch detail address by ID
export async function GET(request: Request, { params }: RouteParms) {
  try {
    // Validate user session dan parse address ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Query address by ID
    const address = await prisma.address.findUnique({
      where: { id },
    });

    // Validate address existence
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validate ownership
    if (address.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Return response dengan address detail
    return NextResponse.json({
      success: true,
      message: "Detail alamat berhasil diambil",
      data: { address },
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

// PUT: Update address by ID
export async function PUT(request: Request, { params }: RouteParms) {
  try {
    // Validate user session dan parse address ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Query existing address untuk validation
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validate address existence
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validate ownership
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Parse dan validate request body
    const body = await request.json();
    const validatedData = updateAddressSchema.parse(body);
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

    // Unset default dari addresses lain jika ini jadi default
    if (isDefault === true) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update address dengan data baru
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        label: label !== undefined ? label : existingAddress.label,
        recipientName:
          recipientName !== undefined
            ? recipientName
            : existingAddress.recipientName,
        phone: phone !== undefined ? phone : existingAddress.phone,
        fullAddress:
          fullAddress !== undefined ? fullAddress : existingAddress.fullAddress,
        city: city !== undefined ? city : existingAddress.city,
        province: province !== undefined ? province : existingAddress.province,
        postalCode:
          postalCode !== undefined ? postalCode : existingAddress.postalCode,
        latitude:
          latitude !== undefined ? latitude : existingAddress.latitude,
        longitude:
          longitude !== undefined ? longitude : existingAddress.longitude,
        isDefault:
          isDefault !== undefined
            ? Boolean(isDefault)
            : existingAddress.isDefault,
      },
    });

    // Return response dengan updated address
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diperbarui",
      data: { address: updatedAddress },
    });
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

// DELETE: Remove address by ID
export async function DELETE(request: Request, { params }: RouteParms) {
  try {
    // Validate user session dan parse address ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id } = await params;

    // Query existing address untuk validation
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    // Validate address existence
    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validate ownership
    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    // Delete address dari database
    await prisma.address.delete({
      where: { id },
    });

    // Set default ke address lain jika yang dihapus default
    if (existingAddress.isDefault) {
      const remainingAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (remainingAddress) {
        await prisma.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true },
        });
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Alamat berhasil dihapus",
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

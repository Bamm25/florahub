import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      message: "Daftar alamat berhasil diambil",
      data: {
        total: addresses.length,
        addresses,
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
    } = body;

    if (
      !label ||
      !recipientName ||
      !phone ||
      !fullAddress ||
      !city ||
      !province ||
      !postalCode
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama penerima, no hp, alamat lengkap, kota, provinsi, kode pos, dan label wajib diisi",
        },
        { status: 400 },
      );
    }

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
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
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

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
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
    const userRole = (session.user as any).role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat mengakses alamat",
        },
        { status: 403 },
      );
    }
    const userId = (session.user as any).id;

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
    console.error("Error fetching addresses:", error);
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
    const userRole = (session.user as any).role;
    if (userRole !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya customer yang dapat mengakses alamat",
        },
        { status: 403 },
      );
    }

    const userId = (session.user as any).id;
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
    console.error("Error creating address:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

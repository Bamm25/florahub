import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteParms = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParms) {
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
    const { id } = await params;

    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (address.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail alamat berhasil diambil",
      data: { address },
    });
  } catch (error) {
    console.error("Error fetching address detail:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParms) {
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
    const { id } = await params;

    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

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
          latitude !== undefined
            ? latitude
              ? parseFloat(latitude)
              : null
            : existingAddress.latitude,
        longitude:
          longitude !== undefined
            ? longitude
              ? parseFloat(longitude)
              : null
            : existingAddress.longitude,
        isDefault:
          isDefault !== undefined
            ? Boolean(isDefault)
            : existingAddress.isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil diperbarui",
      data: { address: updatedAddress },
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParms) {
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
    const { id } = await params;

    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Alamat tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (existingAddress.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Anda tidak memiliki akses ke alamat ini",
        },
        { status: 403 },
      );
    }

    await prisma.address.delete({
      where: { id },
    });

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

    return NextResponse.json({
      success: true,
      message: "Alamat berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}


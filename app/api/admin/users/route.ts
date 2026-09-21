import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
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
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Hanya Admin yang dapat mengakses data pengguna",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const roleParams = searchParams.get("role");

    const whereClause: any = {};

    if (roleParams && Object.values(Role).includes(roleParams as any)) {
      whereClause.role = roleParams as Role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error mengambil data pengguna:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data pengguna",
      },
      { status: 500 },
    );
  }
}

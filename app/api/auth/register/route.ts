import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua form harus diisi",
        },
        {
          status: 400,
        },
      );
    }

    const emailExisting = await prisma.user.findUnique({
      where: { email },
    });

    if (emailExisting) {
      return NextResponse.json(
        {
          success: false,
          message: "Email sudah terdaftar",
        },
        {
          status: 409,
        },
      );
    }

    const validRoles = ["CUSTOMER", "FLORIST", "SUPPLIER"];
    const assignedRole = role && validRoles.includes(role) ? role : "CUSTOMER";

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: assignedRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        message: "Register berhasil",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Error register user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal register user",
      },
      {
        status: 500,
      },
    );
  }
}

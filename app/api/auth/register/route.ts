import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Handler HTTP POST untuk mendaftarkan pengguna baru
export async function POST(request: Request) {
  try {
    // Parse dan validasi data registrasi dari payload permintaan
    const body = await request.json();
    const validatedData = registerSchema.parse(body);
    const { name, email, password, role, phone } = validatedData;

    // Periksa apakah email sudah terdaftar di database
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

    // Enkripsi kata sandi pengguna sebelum disimpan
    const hashPassword = await bcrypt.hash(password, 10);

    // Buat data pengguna baru di database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Kirim respons sukses registrasi pengguna
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
    // Tangani kesalahan validasi skema input
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues,
        },
        {
          status: 400,
        },
      );
    }
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

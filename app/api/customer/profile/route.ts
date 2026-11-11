import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Handler HTTP GET untuk mengambil profil pelanggan beserta data statistik pesanan
export async function GET(request: Request) {
  try {
    // Validasi sesi otentikasi pengguna dan ambil ID pelanggan
    const { userId } = await requireAuth(request, ["CUSTOMER"]);

    // Ambil data profil pengguna dasar dari database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Validasi keberadaan akun pengguna
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Tentukan rentang waktu 12 bulan terakhir untuk perhitungan statistik
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Ambil pesanan yang sudah selesai terkirim dalam 12 bulan terakhir
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
        status: "DELIVERED",
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        totalAmount: true,
      },
    });

    // Hitung total pengeluaran dan jumlah pesanan yang diselesaikan
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    // Kirim respons berhasil beserta data profil dan statistik belanja
    return NextResponse.json(
      {
        success: true,
        message: "Profil berhasil dimuat",
        data: {
          profile: {
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            emailVerified: false,
            createdAt: user.createdAt.toISOString(),
            totalOrders: totalOrders,
            totalSpent: totalSpent,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // Teruskan respons jika error merupakan objek NextResponse dari middleware
    if (error instanceof NextResponse) {
      throw error;
    }

    console.error("Error fetching profile:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memuat profil",
      },
      { status: 500 },
    );
  }
}

// Handler HTTP PATCH untuk memperbarui informasi profil pelanggan
export async function PATCH(request: Request) {
  try {
    // Validasi sesi otentikasi pengguna dan ambil ID pelanggan
    const { userId } = await requireAuth(request, ["CUSTOMER"]);

    const body = await request.json();

    // Skema validasi data pembaruan profil pengguna
    const updateProfileSchema = z.object({
      name: z.string().min(3, "Nama minimal 3 karakter").max(100),
      phone: z.string().regex(/^\d{10,13}$/, "No HP harus 10-13 digit"),
    });

    const validatedData = updateProfileSchema.parse(body);

    // Pastikan nomor telepon belum digunakan oleh pengguna lain
    if (validatedData.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: validatedData.phone,
          id: {
            not: userId,
          },
        },
      });

      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            message: "Nomor telepon sudah digunakan",
          },
          { status: 409 },
        );
      }
    }

    // Perbarui data nama dan nomor telepon pengguna di database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        updatedAt: true,
      },
    });

    // Kirim respons data profil pengguna yang berhasil diperbarui
    return NextResponse.json(
      {
        success: true,
        message: "Profil berhasil diperbarui",
        data: {
          user: updatedUser,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // Teruskan respons jika error merupakan objek NextResponse dari middleware
    if (error instanceof NextResponse) {
      throw error;
    }

    // Tangani galat validasi skema masukan
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

    console.error("Error updating profile:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui profil",
      },
      { status: 500 },
    );
  }
}

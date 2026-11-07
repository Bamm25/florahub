import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// GET: Fetch user profile dengan stats
export async function GET(request: Request) {
  try {
    // Validate user session dan extract user ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);

    // Fetch user profile dengan basic data
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

    // Validate user existence
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Calculate date range untuk stats 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Query delivered orders untuk calculate total spent
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

    // Calculate total spent dan total orders
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    // Return response dengan profile dan stats
    return NextResponse.json(
      {
        success: true,
        message: "Profil berhasil dimuat",
        data: {
          profile: {
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            emailVerified: false, // Can be enhanced with email verification feature
            createdAt: user.createdAt.toISOString(),
            totalOrders: totalOrders,
            totalSpent: totalSpent,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // If error is already a NextResponse (from requireAuth), throw it
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

// PATCH: Update user profile
export async function PATCH(request: Request) {
  try {
    // Validate user session dan extract user ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);

    const body = await request.json();

    // Validation schema untuk profile update
    const updateProfileSchema = z.object({
      name: z.string().min(3, "Nama minimal 3 karakter").max(100),
      phone: z.string().regex(/^\d{10,13}$/, "No HP harus 10-13 digit"),
    });

    const validatedData = updateProfileSchema.parse(body);

    // Check jika phone sudah digunakan user lain
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

    // Update user profile dengan data baru
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

    // Return response dengan updated user data
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
    // If error is already a NextResponse (from requireAuth), throw it
    if (error instanceof NextResponse) {
      throw error;
    }

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

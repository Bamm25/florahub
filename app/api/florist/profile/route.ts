import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/florist/profile - Get florist profile dengan addresses
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    const profile = await prisma.floristProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        shopName: true,
        shopDescription: true,
        logo: true,
        banner: true,
        defaultAddressId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "FloristProfile tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    // Get all addresses untuk florist ini
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      message: "Florist profile berhasil diambil",
      data: {
        profile,
        user,
        addresses,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, message: "Gagal mengambil florist profile" },
      { status: 500 },
    );
  }
}

// PUT /api/florist/profile - Update shop info (name, description, logo, banner)
const updateProfileSchema = z.object({
  shopName: z.string().min(3).max(200).optional(),
  shopDescription: z.string().max(1000).optional().nullable(),
  logo: z.string().url().max(500).optional().nullable(),
  banner: z.string().url().max(500).optional().nullable(),
});

export async function PUT(request: Request) {
  try {
    const { userId } = await requireAuth(request, ["FLORIST", "ADMIN"]);

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const profile = await prisma.floristProfile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ success: false, message: "Profil florist tidak ditemukan" }, { status: 404 });
    }

    const updatedProfile = await prisma.floristProfile.update({
      where: { userId },
      data: {
        shopName: validated.shopName,
        shopDescription: validated.shopDescription,
        logo: validated.logo,
        banner: validated.banner,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shop info berhasil diperbarui",
      data: { profile: updatedProfile },
    });
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
      { success: false, message: "Gagal memperbarui shop info" },
      { status: 500 },
    );
  }
}

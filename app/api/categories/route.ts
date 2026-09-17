import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.flowerCategory.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("error fetch categories:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed fetch categories",
      },
      { status: 500 },
    );
  }
}

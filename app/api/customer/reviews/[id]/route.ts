import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateReviewSchema } from "@/lib/validations/schemas";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT: Update review by ID
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Validate user session dan parse review ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    // Query existing review untuk validation
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    // Validate review existence
    if (!existingReview) {
      return NextResponse.json(
        { success: false, message: "Ulasan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validate ownership
    if (existingReview.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak dapat mengedit ulasan milik orang lain",
        },
        { status: 403 },
      );
    }

    // Parse dan validate request body
    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);
    const { rating, comment, images } = validatedData;

    // Update review dengan data baru
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating:
          rating !== undefined ? Math.round(rating) : existingReview.rating,
        comment: comment !== undefined ? comment : existingReview.comment,
        images: images !== undefined ? images : existingReview.images,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Return response dengan updated review
    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil diperbarui",
      data: {
        review: updatedReview,
      },
    });
  } catch (error) {
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
    // Handle auth errors
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

// DELETE: Remove review by ID
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Validate user session dan parse review ID
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    // Query existing review untuk validation
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    // Validate review existence
    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "Ulasan tidak ditemukan",
        },
        { status: 404 },
      );
    }
    // Validate ownership
    if (existingReview.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Forbidden: Anda tidak dapat menghapus ulasan milik orang lain",
        },
        { status: 403 },
      );
    }

    // Delete review dari database
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil dihapus",
    });
  } catch (error) {
    // Handle auth errors
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

import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateReviewSchema } from "@/lib/validations/schemas";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, message: "Ulasan tidak ditemukan" },
        { status: 404 },
      );
    }

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

    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);
    const { rating, comment, images } = validatedData;

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

    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil diperbarui",
      data: {
        review: updatedReview,
      },
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
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "Ulasan tidak ditemukan",
        },
        { status: 404 },
      );
    }
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

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil dihapus",
    });
  } catch (error) {
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

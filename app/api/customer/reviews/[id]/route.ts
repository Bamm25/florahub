import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateReviewSchema } from "@/lib/validations/schemas";
import { z } from "zod";

// Tipe parameter rute dengan ID ulasan
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Handler HTTP PUT untuk memperbarui ulasan produk pelanggan berdasarkan ID
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Validasi sesi pengguna dan ambil ID ulasan dari parameter rute
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    // Cari data ulasan yang akan diperbarui
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    // Validasi keberadaan data ulasan
    if (!existingReview) {
      return NextResponse.json(
        { success: false, message: "Ulasan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi hak kepemilikan ulasan oleh pengguna terkait
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

    // Parse dan validasi muatan pembaruan ulasan
    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);
    const { rating, comment, images } = validatedData;

    // Simpan perubahan ulasan produk ke database
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

    // Kirim respons berhasil beserta data ulasan yang diperbarui
    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil diperbarui",
      data: {
        review: updatedReview,
      },
    });
  } catch (error) {
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
    // Tangani galat otentikasi pengguna
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

// Handler HTTP DELETE untuk menghapus ulasan produk pelanggan berdasarkan ID
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Validasi sesi pengguna dan ambil ID ulasan dari parameter rute
    const { userId } = await requireAuth(request, ["CUSTOMER"]);
    const { id: reviewId } = await params;

    // Cari data ulasan yang akan dihapus
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    // Validasi keberadaan data ulasan
    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "Ulasan tidak ditemukan",
        },
        { status: 404 },
      );
    }
    // Validasi hak kepemilikan ulasan oleh pengguna terkait
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

    // Hapus data ulasan dari basis data
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Kirim respons berhasil penghapusan ulasan
    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil dihapus",
    });
  } catch (error) {
    // Tangani galat otentikasi pengguna
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

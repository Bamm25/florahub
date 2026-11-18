import { requireAuth } from "@/lib/middleware/requireAuth";
import prisma from "@/lib/prisma";
import { reportServerError } from "@/lib/server-error-report";
import { updateCategorySchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// Handler HTTP GET untuk mengambil detail kategori bunga berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const category = await prisma.flowerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Kategori bunga tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Category detail fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menampilkan detail kategori" },
      { status: 500 },
    );
  }
}

// Handler HTTP PUT untuk memperbarui atau menonaktifkan kategori bunga oleh admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const validatedData = updateCategorySchema.parse(body);
    const { name, description, slug, image, isActive } = validatedData;

    const result = await prisma.$transaction(async (tx) => {
      const existingCategory = await tx.flowerCategory.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return {
          status: 404 as const,
          message: "Kategori bunga tidak ditemukan",
        };
      }

      const nextName = name ? name.trim() : existingCategory.name;
      const nextSlug = slug !== undefined ? slug.trim() : existingCategory.slug;

      if (name !== undefined || slug !== undefined) {
        const duplicateCategory = await tx.flowerCategory.findFirst({
          where: {
            OR: [{ name: nextName }, { slug: nextSlug }],
            NOT: { id },
          },
          select: { id: true, name: true },
        });

        if (duplicateCategory) {
          return {
            status: 409 as const,
            message:
              duplicateCategory.name === nextName
                ? "Nama kategori sudah terdaftar"
                : "Slug kategori sudah digunakan",
          };
        }
      }

      const updatedCategory = await tx.flowerCategory.update({
        where: { id },
        data: {
          name: nextName,
          slug: nextSlug,
          description:
            description !== undefined
              ? description
                ? description.trim()
                : null
              : existingCategory.description,
          image: image !== undefined ? image || null : existingCategory.image,
          isActive:
            isActive !== undefined
              ? Boolean(isActive)
              : existingCategory.isActive,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entity: "FlowerCategory",
          entityId: id,
          oldValue: {
            name: existingCategory.name,
            slug: existingCategory.slug,
            isActive: existingCategory.isActive,
          },
          newValue: {
            name: updatedCategory.name,
            slug: updatedCategory.slug,
            isActive: updatedCategory.isActive,
          },
        },
      });

      return { status: 200 as const, category: updatedCategory };
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.category,
      message: "Kategori bunga berhasil diperbarui",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof NextResponse) {
      return error;
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, message: "Nama atau slug kategori sudah terdaftar" },
        { status: 409 },
      );
    }
    reportServerError("Category update failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui kategori bunga" },
      { status: 500 },
    );
  }
}

// Handler HTTP DELETE untuk menghapus kategori yang tidak memiliki produk aktif
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth(request, ["ADMIN"]);
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.flowerCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        return {
          status: 404 as const,
          message: "Kategori bunga tidak ditemukan",
        };
      }

      if (category._count.products > 0) {
        return {
          status: 409 as const,
          message: `Kategori tidak bisa dihapus karena masih digunakan oleh ${category._count.products} produk. Nonaktifkan kategori jika tidak ingin ditampilkan.`,
        };
      }

      await tx.flowerCategory.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entity: "FlowerCategory",
          entityId: id,
          oldValue: {
            name: category.name,
            slug: category.slug,
            isActive: category.isActive,
          },
        },
      });

      return { status: 200 as const };
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kategori bunga berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Category deletion failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus kategori bunga" },
      { status: 500 },
    );
  }
}

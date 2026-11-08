import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename: uuid_timestamp.extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${randomUUID()}_${Date.now()}.${ext}`;

    let publicUrl = "";

    // Gunakan Cloudflare R2 jika sudah dikonfigurasi
    if (isR2Configured) {
      publicUrl = await uploadToR2(buffer, filename, file.type);
    } else {
      // Fallback lokal jika R2 credentials belum diisi (untuk development)
      const uploadDir = join(process.cwd(), "public", "uploads", "products");
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      publicUrl = `/uploads/products/${filename}`;
    }

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      storage: isR2Configured ? "cloudflare-r2" : "local-fallback",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload gambar. Coba lagi" },
      { status: 500 }
    );
  }
}

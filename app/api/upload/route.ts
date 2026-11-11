import { NextRequest, NextResponse } from "next/server";
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

    // Produk florist hanya menerima URL publik Cloudflare R2.
    if (!isR2Configured || !process.env.R2_PUBLIC_URL?.trim()) {
      return NextResponse.json(
        { error: "Cloudflare R2 belum dikonfigurasi lengkap (termasuk R2_PUBLIC_URL)" },
        { status: 503 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${randomUUID()}_${Date.now()}.${ext}`;
    const publicUrl = await uploadToR2(buffer, filename, file.type);

    // Jangan tampilkan preview sukses bila URL publik belum bisa diakses.
    let reachable = false;
    try {
      const image = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      reachable = image.ok && (image.headers.get("content-type")?.startsWith("image/") ?? false);
    } catch (error) {
      console.error("R2 public image verification failed:", error);
    }
    if (!reachable) {
      return NextResponse.json(
        { error: "Gambar belum tersedia melalui URL publik Cloudflare R2" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      storage: "cloudflare-r2",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload gambar. Coba lagi" },
      { status: 500 }
    );
  }
}

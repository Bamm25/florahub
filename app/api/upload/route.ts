import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

// Batasan ukuran maksimum berkas unggahan sebesar 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Daftar format berkas gambar yang diizinkan untuk diunggah
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

// Handler HTTP POST untuk mengunggah berkas gambar ke Cloudflare R2
export async function POST(request: NextRequest) {
  try {
    // Ambil data berkas dari form data permintaan
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    // Validasi format ekstensi dan tipe MIME berkas
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF" },
        { status: 400 }
      );
    }

    // Validasi batasan ukuran berkas
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB" },
        { status: 400 }
      );
    }

    // Pastikan konfigurasi Cloudflare R2 dan URL publik telah aktif
    if (!isR2Configured || !process.env.R2_PUBLIC_URL?.trim()) {
      return NextResponse.json(
        { error: "Cloudflare R2 belum dikonfigurasi lengkap (termasuk R2_PUBLIC_URL)" },
        { status: 503 }
      );
    }

    // Siapkan buffer data berkas dan buat nama berkas acak yang unik
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${randomUUID()}_${Date.now()}.${ext}`;
    const publicUrl = await uploadToR2(buffer, filename, file.type);

    // Verifikasi keterjangkauan gambar melalui URL publik Cloudflare R2
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

    // Kembalikan metadata berkas yang berhasil diunggah
    return NextResponse.json({
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      storage: "cloudflare-r2",
    });
  } catch (error) {
    // Tangani kegagalan saat proses unggah berkas
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload gambar. Coba lagi" },
      { status: 500 }
    );
  }
}

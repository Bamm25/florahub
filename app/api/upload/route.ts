import { reportServerError } from "@/lib/server-error-report";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/config/domain";
import {
  detectImageMime,
  MIME_TO_EXTENSION,
  normalizeClientImageMime,
} from "@/lib/upload-security";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Handler HTTP POST terautentikasi untuk mengunggah berkas gambar tervalidasi ke Cloudflare R2
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request, [
      "FLORIST",
      "SUPPLIER",
      "CUSTOMER",
      "ADMIN",
    ]);

    const limitCheck = checkRateLimit(`upload:${userId}`, 30, 60_000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Terlalu banyak unggahan. Silakan coba lagi sebentar.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limitCheck.retryAfterSec) },
        },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.type.toLowerCase() as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Ukuran file harus antara 1 byte hingga ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        {
          error:
            "Isi file tidak cocok dengan signature gambar yang valid (JPG, PNG, WebP, GIF)",
        },
        { status: 400 },
      );
    }

    const normalizedClientType = normalizeClientImageMime(file.type);
    if (normalizedClientType && normalizedClientType !== detectedMime) {
      return NextResponse.json(
        {
          error: "Tipe MIME tidak sesuai dengan konten berkas gambar",
        },
        { status: 400 },
      );
    }

    if (!isR2Configured || !process.env.R2_PUBLIC_URL?.trim()) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 belum dikonfigurasi lengkap (termasuk R2_PUBLIC_URL)",
        },
        { status: 503 },
      );
    }

    const ext = MIME_TO_EXTENSION[detectedMime];
    const filename = `${randomUUID()}_${Date.now()}.${ext}`;
    const publicUrl = await uploadToR2(buffer, filename, detectedMime);

    let reachable = false;
    try {
      const image = await fetch(publicUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      reachable =
        image.ok &&
        (image.headers.get("content-type")?.startsWith("image/") ?? false);
    } catch (error) {
      reportServerError("R2 public image verification failed:", error);
    }
    if (!reachable) {
      return NextResponse.json(
        { error: "Gambar belum tersedia melalui URL publik Cloudflare R2" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      url: publicUrl,
      filename,
      size: file.size,
      type: detectedMime,
      storage: "cloudflare-r2",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    reportServerError("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload gambar. Coba lagi" },
      { status: 500 },
    );
  }
}

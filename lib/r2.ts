import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Inisialisasi S3Client yang dikonfigurasi untuk Cloudflare R2
const isR2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

/**
 * Upload file buffer langsung ke Cloudflare R2 bucket.
 * Mengembalikan public URL dari file yang di-upload.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!r2Client || !process.env.R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 belum dikonfigurasi di environment variables.");
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  const key = `products/${filename}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  // Dapatkan base public URL (Custom Domain atau R2.dev public URL)
  let publicUrlBase = process.env.R2_PUBLIC_URL || "";
  // Hapus trailing slash jika ada
  if (publicUrlBase.endsWith("/")) {
    publicUrlBase = publicUrlBase.slice(0, -1);
  }

  // Jika publicUrlBase belum diset, gunakan default path
  if (!publicUrlBase) {
    return `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }

  return `${publicUrlBase}/${key}`;
}

export { isR2Configured };

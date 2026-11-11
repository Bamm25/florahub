import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Status ketersediaan konfigurasi variabel lingkungan Cloudflare R2
const isR2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

// Inisialisasi klien S3 yang terhubung ke penyimpanan objek Cloudflare R2
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

// Fungsi untuk mengunggah buffer berkas ke Cloudflare R2 dan mengembalikan URL publik
export async function uploadToR2(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!r2Client || !process.env.R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 belum dikonfigurasi di environment variables.");
  }

  const publicUrlBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!publicUrlBase || !/^https:\/\/[^/]+$/i.test(publicUrlBase)) {
    throw new Error("R2_PUBLIC_URL harus berupa URL publik HTTPS yang valid.");
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

  return `${publicUrlBase}/${key}`;
}

export { isR2Configured };

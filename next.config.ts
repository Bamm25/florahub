import type { NextConfig } from "next";
import path from "node:path";

function resolveR2Patterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "**.r2.dev" },
    { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
  ];
  const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (r2PublicUrl) {
    try {
      const parsed = new URL(r2PublicUrl);
      if (parsed.protocol === "https:" && parsed.hostname) {
        patterns.unshift({ protocol: "https", hostname: parsed.hostname });
      }
    } catch {
      // Abaikan R2_PUBLIC_URL tidak valid saat build konfigurasi
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    remotePatterns: resolveR2Patterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

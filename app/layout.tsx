import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthProvider from "@/components/providers/AuthProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloraHub - Platform E-Commerce & Supply Chain untuk Bisnis Florikultura",
  description:
    "Platform digital yang menghubungkan supplier, florist, dan customer dalam satu ekosistem. Kelola pre-order, inventory real-time, pembayaran online, dan tracking pengiriman untuk bisnis bunga yang lebih efisien.",
  keywords: [
    "E-Commerce Bunga",
    "Platform Florist",
    "Supply Chain Florikultura",
    "Pre-Order Bunga Online",
    "Manajemen Stok Bunga",
    "Marketplace Florist",
    "B2B Florikultura",
    "Sistem Inventory Bunga",
    "Payment Gateway Midtrans",
    "Real-Time Tracking"
  ],
  authors: [{ name: "Bambang Wijanarko" }],
  creator: "Bambang Wijanarko",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://florahub.com",
    title: "FloraHub - Platform E-Commerce & Supply Chain untuk Bisnis Florikultura",
    description: "Solusi digital untuk menghubungkan supplier, florist, dan customer. Pre-order, inventory management, dan e-commerce terintegrasi dalam satu platform.",
    siteName: "FloraHub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FloraHub - Platform E-Commerce Florikultura"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "FloraHub - Platform E-Commerce & Supply Chain untuk Bisnis Florikultura",
    description: "Solusi digital untuk menghubungkan supplier, florist, dan customer dalam ekosistem florikultura.",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>

        {/* Midtrans Snap Script */}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

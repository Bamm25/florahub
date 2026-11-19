import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthProvider from "@/components/providers/AuthProvider";
import Script from "next/script";
import {
  MIDTRANS_SNAP_SCRIPT_URL,
  PUBLIC_SITE_URL,
  SITE_AUTHOR,
} from "@/lib/config/domain";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: "FloraHub - Platform E-Commerce & Supply Chain untuk Bisnis Florikultura",
    template: "%s | FloraHub",
  },
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
  authors: [{ name: SITE_AUTHOR }],
  creator: SITE_AUTHOR,
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: PUBLIC_SITE_URL,
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
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        plusJakartaSans.variable,
        instrumentSerif.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>

        {/* Midtrans Snap Script */}
        <Script
          src={MIDTRANS_SNAP_SCRIPT_URL}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

"use client";

import ProductGrid from "@/components/customer/ProductGrid";
import { getProducts } from "@/lib/api/products";
import type { Product } from "@/types";
import { useEffect, useState } from "react";
import { Flower2, Sparkles, TrendingUp, Package, Bell, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const response = await getProducts();
        setProducts(response.data.products);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat produk",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-base font-medium text-muted-foreground">Memuat produk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-error/10 mb-4">
            <Flower2 className="h-8 w-8 text-error" />
          </div>
          <p className="text-lg font-bold text-foreground mb-2">Gagal Memuat Produk</p>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="section-spacing bg-gradient-to-br from-surface via-surface-container-low to-primary/5 border-b border-border">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-6">
              <Flower2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Platform E-Commerce & Supply Chain Florikultura</span>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight text-foreground lg:text-6xl mb-6">
              Menghubungkan Supplier, Florist &
              <span className="text-primary"> Customer</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Platform terintegrasi untuk bisnis florikultura. Kelola pre-order, pantau stok real-time, 
              terima pembayaran online, dan lacak pengiriman dalam satu sistem yang efisien.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#products" className="btn-primary text-lg px-8">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Belanja Sekarang
              </Link>
              <Link 
                href="/auth/register" 
                className="btn-secondary text-lg px-8"
              >
                Daftar Sebagai Florist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 3 CORE Features */}
      <section className="section-spacing border-b border-border">
        <div className="container-custom">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
              Kenapa Memilih FloraHub?
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Solusi lengkap untuk operasional dan koordinasi bisnis florikultura modern
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
            {/* Feature 1: Digital Supply Chain Integration */}
            <div className="flex flex-col items-center text-center p-8 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Ekosistem Terintegrasi</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Hubungkan supplier, florist, dan customer dalam satu platform untuk koordinasi dan transparansi data yang lebih baik
              </p>
            </div>

            {/* Feature 2: Pre-Order & Inventory Management */}
            <div className="flex flex-col items-center text-center p-8 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-secondary/10 mb-4">
                <Package className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Pre-Order & Inventory Management</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Sistem pre-order dari florist ke supplier dengan monitoring stok real-time dan notifikasi otomatis untuk produk segar
              </p>
            </div>

            {/* Feature 3: E-Commerce with Payment & Tracking */}
            <div className="flex flex-col items-center text-center p-8 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-tertiary/10 mb-4">
                <Bell className="h-8 w-8 text-tertiary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Pembayaran & Pengiriman</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Pembayaran online terintegrasi dan sistem tracking pengiriman real-time untuk transparansi penuh
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="section-spacing">
        <div className="container-custom">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              Katalog Produk Florikultura
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Bunga segar berkualitas dari florist terpercaya dengan harga transparan
            </p>
          </div>
          
          <ProductGrid products={products} />
        </div>
      </section>
    </main>
  );
}

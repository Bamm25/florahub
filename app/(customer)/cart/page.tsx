"use client";

import CartTable from "@/components/customer/CartTable";
import { useCartStore } from "@/lib/stores/cartStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, ArrowLeft } from "lucide-react";

// Halaman keranjang belanja dengan list items dan ringkasan
export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.getTotal());
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch dengan delay mounting untuk sync client/server
  useEffect(() => {
    // Set mounted in next tick to avoid setting state during render
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Render skeleton saat belum mounted untuk prevent hydration error
  if (!mounted) {
    return (
      <div className="container-custom py-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container" />
        <div className="mt-8 h-96 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  return (
    <div className="container-custom section-spacing">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          Keranjang Belanja
        </h1>
        <p className="text-base text-muted-foreground">
          {items.length > 0 
            ? `${items.length} produk siap untuk checkout` 
            : "Keranjang Anda masih kosong"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Keranjang Kosong
          </h2>
          <p className="text-base text-muted-foreground mb-8 max-w-md">
            Belum ada produk di keranjang Anda. Yuk mulai belanja dan pilih bunga segar favorit!
          </p>
          <Link href="/" className="btn-primary">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CartTable />
          </div>
          
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="rounded-xl border border-border bg-surface-container p-6 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  Ringkasan Belanja
                </h2>
                
                <div className="space-y-4 border-b border-border pb-6">
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Subtotal ({items.length} produk)</span>
                    <span className="font-semibold text-foreground">
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Biaya Admin</span>
                    <span className="font-semibold text-success">Gratis</span>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between text-lg">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>
                
                <Link
                  href="/checkout"
                  className="btn-primary w-full mt-6 h-14 text-base"
                >
                  Lanjut ke Pembayaran
                </Link>
                
                <Link
                  href="/"
                  className="mt-4 flex items-center justify-center gap-2 text-base font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Lanjut Belanja
                </Link>
              </div>

              {/* Trust Signals */}
              <div className="mt-6 rounded-xl bg-surface-container-low p-5 border border-border">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      Belanja Aman & Terpercaya
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Transaksi dijamin aman dengan sistem pembayaran terenkripsi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

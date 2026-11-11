"use client";

import CartTable from "@/components/customer/CartTable";
import { useCartStore } from "@/lib/stores/cartStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";

// Halaman keranjang belanja dengan list items dan ringkasan
export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.getTotal());
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch dengan delay mounting untuk sync client/server
  useEffect(() => {
    // Sinkronisasi status mounted setelah render pertama sisi klien
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Render skeleton saat belum mounted untuk prevent hydration error
  if (!mounted) {
    return (
      <div className="container-custom py-12" role="status">
        <span className="sr-only">Memuat keranjang...</span>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="pb-16 sm:pb-24">
      {/* Masthead */}
      <section className="border-b border-border bg-surface py-10 sm:py-14">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Langkah 1 dari 2 · Keranjang
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Keranjang Belanja
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                {items.length > 0
                  ? `${items.length} jenis bunga (${itemCount} tangkai) siap diproses.`
                  : "Keranjang belanja Anda saat ini masih kosong."}
              </p>
            </div>
            {items.length > 0 && (
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Tambah bunga lainnya
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container-custom pt-8 sm:pt-10">
        {items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Mulai pilih bunga segar favorit Anda
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Jelajahi ratusan bunga segar langsung dari florist lokal tepercaya di FloraHub.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="btn-primary">
                Jelajahi Katalog Bunga
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/stores"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Cari Toko Florist
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:gap-14">
            {/* Table Column */}
            <div>
              <CartTable />
            </div>

            {/* Sticky Summary Column */}
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10121b] p-6 text-white sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b4aeff]">
                  Ringkasan Pesanan
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  Total Belanja
                </h2>

                <dl className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
                  <div className="flex items-center justify-between text-white/70">
                    <dt>Subtotal ({itemCount} tangkai)</dt>
                    <dd className="font-semibold text-white">
                      Rp {total.toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <dt>Biaya Pengiriman</dt>
                    <dd className="text-xs text-white/60">
                      Dihitung di checkout
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <dt>Biaya Layanan</dt>
                    <dd className="inline-flex items-center gap-1 font-semibold text-[#09e354]">
                      Gratis
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-6">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-white/60">
                      Total sementara
                    </span>
                    <p className="text-xs text-white/40">Belum termasuk ongkir</p>
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    Rp {total.toLocaleString("id-ID")}
                  </p>
                </div>

                <Link
                  href="/checkout"
                  className="btn-primary mt-6 w-full text-base font-semibold"
                >
                  Lanjut ke Checkout
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href="/products"
                  className="mt-4 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Lanjut Belanja
                </Link>
              </div>

              {/* Calm Trust Signals */}
              <div className="mt-4 rounded-2xl border border-border bg-surface p-5 text-sm">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Truck className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span>Pengiriman langsung dari florist terdekat kota tujuan Anda.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span>Garansi kesegaran bunga dan keamanan pembayaran Midtrans.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span>Kemasan khusus florist agar tangkai tetap segar dan rapi.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

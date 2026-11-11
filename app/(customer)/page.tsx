"use client";

import ProductGrid from "@/components/customer/ProductGrid";
import { getProducts } from "@/lib/api/products";
import type { Product } from "@/types";
import { useEffect, useState } from "react";

import Link from "next/link";

// Component utama halaman beranda customer
export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch daftar produk saat component mount
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

  return (
    <main>
      <section className="mx-3 mt-3 overflow-hidden rounded-[24px] bg-[#10121b] text-white sm:mx-6 sm:mt-6 lg:rounded-[32px]">
        <div className="container-custom grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)] lg:items-end lg:gap-20 lg:py-24">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4aeff]">FloraHub · Bunga dari florist lokal</p>
            <h1 className="max-w-[850px] text-[clamp(2.5rem,5.3vw,5.3rem)] font-extrabold leading-[1.09] tracking-[-0.025em] [text-wrap:balance] text-white">Bunga yang tepat, untuk setiap momen.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">Jelajahi pilihan bunga dari florist, pilih yang Anda suka, lalu pesan langsung dalam satu tempat.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary min-w-[190px]">Lihat bunga</Link>
              <Link href="/stores" className="inline-flex h-14 items-center justify-center rounded-xl border border-white/25 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10">Jelajahi toko</Link>
            </div>
          </div>
          <div className="border-t border-white/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Untuk florist</p>
            <p className="mt-4 max-w-xs text-2xl font-semibold leading-snug tracking-tight text-white">Rencanakan kebutuhan bunga dan kelola pesanan toko dalam satu tempat.</p>
            <Link href="/auth/register?role=FLORIST" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#b4aeff] underline underline-offset-4 hover:text-white">Daftar sebagai florist <span aria-hidden="true" className="ml-2">↗</span></Link>
          </div>
        </div>
      </section>
      <section id="products" className="container-custom py-16 sm:py-20">
        <div className="mb-9 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pilihan bunga</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Temukan bunga untuk Anda</h2>
            <p className="mt-3 text-base text-muted-foreground">Lihat koleksi yang tersedia dari florist di FloraHub.</p>
          </div>
          <Link href="/products" className="inline-flex min-h-11 shrink-0 items-center font-semibold text-primary underline-offset-4 hover:underline">Lihat semua produk <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        {isLoading ? (
          <div role="status" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Memuat produk...</span>
            {[0, 1, 2].map((item) => <div key={item} className="animate-pulse"><div className="aspect-square rounded-2xl bg-muted" /><div className="mt-4 h-5 w-2/3 rounded bg-muted" /><div className="mt-3 h-4 w-1/3 rounded bg-muted" /></div>)}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-border bg-muted/40 px-6 py-10">
            <h3 className="text-xl font-semibold">Produk belum bisa ditampilkan</h3>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-secondary mt-6">Coba lagi</button>
          </div>
        ) : <ProductGrid products={products} />}
      </section>
      <section aria-labelledby="alur-heading" className="bg-[#090a10] py-16 text-white sm:py-24">
        <div className="container-custom">
          <div className="grid gap-5 lg:grid-cols-[1fr_2fr] lg:items-end lg:gap-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b4aeff]">Dari kebun ke pelanggan</p>
            <h2 id="alur-heading" className="max-w-3xl text-3xl font-bold leading-tight tracking-[-0.02em] text-white [text-wrap:balance] sm:text-4xl lg:text-5xl">
              Satu alur untuk bunga, dari pasokan hingga pesanan.
            </h2>
          </div>

          <div className="mt-12 grid border-t border-white/25 lg:grid-cols-3 lg:mt-16">
            <div className="border-b border-white/20 py-7 lg:border-b-0 lg:pr-8 lg:pb-8">
              <p className="text-sm font-semibold text-[#b4aeff]">01 / Supplier</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">Siapkan pasokan</h3>
              <p className="mt-2 max-w-xl text-base leading-7 text-white/70">Catat stok bunga dan bagikan rencana panen kepada florist.</p>
            </div>
            <div className="border-b border-white/20 py-7 lg:border-x lg:border-b-0 lg:px-8 lg:pb-8">
              <p className="text-sm font-semibold text-[#b4aeff]">02 / Florist</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">Rencanakan & jual</h3>
              <p className="mt-2 max-w-xl text-base leading-7 text-white/70">Ajukan pre-order, kelola stok, lalu proses pesanan pelanggan.</p>
            </div>
            <div className="py-7 lg:pl-8 lg:pr-6 lg:pb-8">
              <p className="text-sm font-semibold text-[#b4aeff]">03 / Customer</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">Pilih & pantau</h3>
              <p className="mt-2 max-w-xl text-base leading-7 text-white/70">Cari produk, checkout, dan ikuti status pesanan.</p>
            </div>
          </div>
          <p className="mt-8 border-t border-white/20 pt-6 text-sm leading-6 text-white/60 lg:mt-12">
            Admin mengelola pengguna dan kategori, serta memantau transaksi di balik layar.
          </p>
        </div>
      </section>
      <section className="border-t border-border py-14 sm:py-20">
        <div className="container-custom flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Untuk pelaku usaha bunga</p>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Hubungkan pasokan dan toko Anda.</h2>
            <p className="mt-3 max-w-lg text-muted-foreground">Daftar sebagai supplier untuk mengelola pasokan, atau sebagai florist untuk mengelola produk dan pesanan.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/auth/register?role=FLORIST" className="btn-primary shrink-0">Daftar florist</Link><Link href="/auth/register?role=SUPPLIER" className="btn-secondary shrink-0">Daftar supplier</Link></div>
        </div>
      </section>
    </main>
  );
}

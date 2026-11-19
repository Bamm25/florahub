"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Flame, Flower2, Sprout, Truck } from "lucide-react";
import StarProductsShowcase from "@/components/customer/StarProductsShowcase";
import { ErrorState, LoadingSpinner } from "@/components/ui";
import { useDataFetching } from "@/hooks";
import { getStarProducts } from "@/lib/api/products";
import { formatRupiah } from "@/lib/utils/formatters";

// Component utama halaman beranda customer
export default function HomePage() {
  const { data, isLoading, error, refetch } = useDataFetching(
    (signal) => getStarProducts(5, signal),
    [],
  );

  const products = data?.products ?? [];
  const mode = data?.mode ?? "best-selling";
  const heroStar = products[0] ?? null;

  return (
    <main>
      {/* Band 1: Full-Bleed Dark Hero */}
      <section className="border-b border-white/10 bg-surface-dark text-white">
        <div className="container-custom grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p
              data-enter
              style={{ "--d": "0ms" } as React.CSSProperties}
              className="mb-5 text-xs font-medium tracking-[0.04em] text-kicker"
            >
              Bunga segar lokal
            </p>
            <h1
              data-enter
              style={{ "--d": "80ms" } as React.CSSProperties}
              className="max-w-[850px] text-[clamp(2.25rem,1.5rem+3.2vw,4.75rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white"
            >
              Bunga yang tepat,{" "}
              <span className="font-display font-normal italic text-kicker">
                dari kebun ke meja Anda
              </span>
              .
            </h1>
            <p
              data-enter
              style={{ "--d": "150ms" } as React.CSSProperties}
              className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg"
            >
              Rangkaian bunga segar dari florist lokal Surabaya, Malang, dan sekitarnya.
            </p>
            <div
              data-enter
              style={{ "--d": "220ms" } as React.CSSProperties}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/products" className="btn-primary min-w-[200px]">
                Lihat Katalog
              </Link>
              <Link
                href="/stores"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/25 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Lihat Toko
              </Link>
            </div>
          </div>

          <aside
            data-enter
            style={{ "--d": "180ms" } as React.CSSProperties}
            className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 sm:p-6"
          >
            {heroStar && heroStar.image ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.04em] text-kicker">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    {mode === "best-selling" && (heroStar.soldCount ?? 0) > 0
                      ? "#1 Terlaris"
                      : "Pilihan Florist"}
                  </span>
                  {(heroStar.soldCount ?? 0) > 0 && (
                    <span className="text-xs font-semibold tabular-nums text-white/70">
                      {heroStar.soldCount} terjual
                    </span>
                  )}
                </div>

                <Link
                  href={`/products/${heroStar.slug}`}
                  className="group mt-4 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-darker">
                    <Image
                      src={heroStar.image}
                      alt={heroStar.name}
                      fill
                      className="m-zoom object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-kicker">
                      {heroStar.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/60">
                      {heroStar.florist?.floristProfile?.shopName ||
                        heroStar.florist?.name ||
                        "Toko Florist"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold tabular-nums text-white">
                        {formatRupiah(heroStar.price)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-kicker">
                        Lihat <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium tracking-[0.04em] text-kicker">
                  Mitra Florist
                </p>
                <p className="mt-3 text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
                  Jual rangkaian bunga Anda langsung di FloraHub.
                </p>
              </div>
            )}

            <div className="mt-5 border-t border-white/12 pt-5">
              <p className="text-xs font-medium text-white/60">
                Punya toko bunga?
              </p>
              <Link
                href="/auth/register?role=FLORIST"
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-kicker underline underline-offset-4 hover:text-white"
              >
                Daftar jadi florist <span aria-hidden="true" className="ml-2">↗</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Band 2: Star Products (Paling Sering Dibeli Lintas Florist) */}
      <section id="products" className="bg-background py-16 sm:py-24">
        <div className="container-custom">
          <div className="mb-10 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.04em] text-primary">
                {mode === "best-selling" ? "Terlaris" : "Pilihan Florist"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Bunga paling{" "}
                <span className="font-display font-normal italic text-primary">
                  sering dibeli
                </span>
              </h2>
              <p className="mt-2.5 max-w-2xl text-base text-muted-foreground">
                {mode === "best-selling"
                  ? "Pilihan favorit pembeli dari seluruh toko florist."
                  : "Pilihan rangkaian unggulan dari florist kami."}
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex min-h-11 shrink-0 items-center font-semibold text-primary underline-offset-4 hover:underline"
            >
              Lihat semua <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Memuat produk..." />
          ) : error ? (
            <ErrorState
              title="Produk belum bisa ditampilkan"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : (
            <StarProductsShowcase products={products} mode={mode} />
          )}
        </div>
      </section>

      {/* Band 3: Full-Bleed Dark Supply Chain — Centered Architectural Header */}
      <section
        aria-labelledby="alur-heading"
        className="border-y border-white/10 bg-surface-dark py-16 text-white sm:py-24"
      >
        <div className="container-custom">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium tracking-[0.06em] text-kicker">
              Cara kerja FloraHub
            </p>
            <h2
              id="alur-heading"
              className="mt-4 text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl"
            >
              Terhubung langsung dari{" "}
              <span className="font-display font-normal italic text-kicker">
                kebun, florist, hingga penerima
              </span>
              .
            </h2>
          </div>

          <div className="mt-12 grid border-y border-white/15 lg:mt-14 lg:grid-cols-3">
            <div className="border-b border-white/15 py-8 lg:border-b-0 lg:pr-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-kicker">
                <Sprout className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-[0.04em] text-kicker">
                Kebun &amp; Supplier
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Stok panen segar
              </h3>
              <p className="mt-2.5 text-base leading-7 text-white/70">
                Petani menawarkan bunga potong segar dan jadwal panen langsung ke florist.
              </p>
            </div>

            <div className="border-b border-white/15 py-8 lg:border-x lg:border-b-0 lg:px-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-kicker">
                <Flower2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-[0.04em] text-kicker">
                Toko Florist
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Dirangkai sesuai pesanan
              </h3>
              <p className="mt-2.5 text-base leading-7 text-white/70">
                Florist merangkai bunga segar harian dan mengatur pengiriman ke pembeli.
              </p>
            </div>

            <div className="py-8 lg:pl-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-kicker">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-[0.04em] text-kicker">
                Pembeli
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Pesan &amp; pantau mudah
              </h3>
              <p className="mt-2.5 text-base leading-7 text-white/70">
                Pilih rangkaian dari toko favorit, bayar praktis, lalu pantau pengiriman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Band 4: Light Bridge Before Darker Footer */}
      <section className="bg-surface-container-low py-14 sm:py-20">
        <div className="container-custom flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Gabung bersama FloraHub.
            </h2>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Buka toko florist atau salurkan hasil panen kebun Anda.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/register?role=FLORIST" className="btn-primary shrink-0">
              Daftar Florist
            </Link>
            <Link href="/auth/register?role=SUPPLIER" className="btn-secondary shrink-0">
              Daftar Supplier
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

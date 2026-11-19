import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { getPublicStore } from "@/lib/public-store";
import { getStoreDetailMetrics } from "@/lib/public-store-metrics";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Flower2,
  MapPin,
  Star,
  Store,
} from "lucide-react";
import StoreQuickAddButton from "@/components/customer/StoreQuickAddButton";
import { formatRupiah } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

const STORE_SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "best-selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga Terendah" },
  { value: "price-desc", label: "Harga Tertinggi" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await getPublicStore(prisma, id);
  if (!store) {
    return {
      title: "Toko Tidak Ditemukan",
      description: "Halaman toko florist tidak ditemukan di FloraHub.",
    };
  }
  const shopName = store.floristProfile?.shopName || store.name;
  const description =
    store.floristProfile?.shopDescription ||
    `Jelajahi rangkaian bunga segar siap kirim dari ${shopName} di FloraHub.`;

  return {
    title: shopName,
    description,
  };
}

// Tampilkan profil florist dan katalog aktif yang dimiliki toko ini.
export default async function PublicStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ category?: string; sort?: string }>;
}) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const activeCategory = resolvedSearch.category?.trim() || "";
  const activeSort = resolvedSearch.sort?.trim() || "newest";

  const store = await getPublicStore(prisma, id);
  if (!store) notFound();

  const shopName = store.floristProfile?.shopName || store.name;
  const logo = store.floristProfile?.logo || store.image;
  const banner = store.floristProfile?.banner;
  const location = store.floristProfile?.defaultAddress;

  const metrics = await getStoreDetailMetrics(
    prisma,
    store.products.map((p) => p.id),
  );

  const enrichedProducts = store.products.map((product) => ({
    ...product,
    metric: metrics.byProductId[product.id],
  }));

  const spotlightProduct =
    !activeCategory && enrichedProducts.length >= 2
      ? (enrichedProducts.find((item) => item.id === metrics.starProductId) ??
        enrichedProducts[0])
      : null;

  const filteredProducts = activeCategory
    ? enrichedProducts.filter(
        (product) => product.metric?.categoryName === activeCategory,
      )
    : enrichedProducts;

  const visibleProducts = filteredProducts.toSorted((a, b) => {
    switch (activeSort) {
      case "best-selling":
        return (
          (b.metric?.soldCount ?? 0) - (a.metric?.soldCount ?? 0) ||
          (b.metric?.averageRating ?? 0) - (a.metric?.averageRating ?? 0)
        );
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "newest":
      default:
        return 0;
    }
  });

  const buildStoreHref = (nextCategory: string, nextSort: string) => {
    const query = new URLSearchParams();
    if (nextCategory) query.set("category", nextCategory);
    if (nextSort && nextSort !== "newest") query.set("sort", nextSort);
    const qs = query.toString();
    return qs ? `/stores/${id}?${qs}` : `/stores/${id}`;
  };

  const heroCover = banner || spotlightProduct?.image || enrichedProducts[0]?.image;

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Atelier Hero */}
      <section className="border-b border-white/10 bg-surface-dark text-white">
        <div className="container-custom py-10 sm:py-14 lg:py-16">
          <nav aria-label="Navigasi" className="mb-8">
            <Link
              href="/stores"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-kicker"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Semua Toko
            </Link>
          </nav>

          <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-kicker">
                  Toko Terverifikasi
                </span>
                {location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/80">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-kicker" aria-hidden="true" />
                    {location.city}, {location.province}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] sm:h-20 sm:w-20">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={shopName}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <Store className="h-8 w-8 text-kicker" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {shopName}
                  </h1>
                </div>
              </div>

              {store.floristProfile?.shopDescription && (
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                  {store.floristProfile.shopDescription}
                </p>
              )}

              <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-white/60">Produk</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-white">
                    {store.products.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Mulai</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-white">
                    {metrics.minPrice !== null
                      ? formatRupiah(metrics.minPrice)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">
                    {metrics.totalSold > 0 ? "Terjual" : "Kategori"}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-white">
                    {metrics.totalSold > 0
                      ? metrics.totalSold
                      : metrics.categories.length || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Rating</p>
                  <p className="mt-1 flex items-center gap-1 text-xl font-bold tabular-nums text-white">
                    {metrics.averageRating !== null ? (
                      <>
                        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                        <span>{metrics.averageRating.toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-kicker">
                        Baru
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-surface-darker">
                {banner ? (
                  <Image
                    src={banner}
                    alt={`Banner ${shopName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    priority
                    unoptimized
                  />
                ) : heroCover ? (
                  <Image
                    src={heroCover}
                    alt={`Koleksi unggulan ${shopName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <span className="font-display text-5xl italic text-kicker">
                      {shopName.slice(0, 2).toUpperCase()}
                    </span>
                    <p className="mt-2 text-xs font-medium tracking-[0.04em] text-white/60">
                      Toko Florist
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Karya Studio Spotlight */}
      {spotlightProduct && (
        <section className="border-b border-border bg-surface-container-low/50 py-10 sm:py-12">
          <div className="container-custom">
            <div className="mb-5 flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-primary">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {metrics.starProductId === spotlightProduct.id
                  ? "Paling Diminati"
                  : "Produk Pilihan"}
              </p>
            </div>

            <article className="m-card group grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-12">
              <Link
                href={`/products/${spotlightProduct.slug}`}
                className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-container lg:col-span-6 lg:aspect-auto lg:min-h-[340px]"
              >
                {spotlightProduct.image ? (
                  <Image
                    src={spotlightProduct.image}
                    alt={spotlightProduct.name}
                    fill
                    className="m-zoom object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Gambar tidak tersedia
                  </div>
                )}
              </Link>

              <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    {spotlightProduct.metric?.categoryName && (
                      <span className="rounded-full border border-border bg-surface-container-low px-3 py-1 font-medium text-foreground">
                        {spotlightProduct.metric.categoryName}
                      </span>
                    )}
                    {(spotlightProduct.metric?.soldCount ?? 0) > 0 && (
                      <span className="font-semibold tabular-nums text-primary">
                        {spotlightProduct.metric?.soldCount} terjual
                      </span>
                    )}
                    {spotlightProduct.metric?.averageRating && (
                      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                        {spotlightProduct.metric.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    <Link
                      href={`/products/${spotlightProduct.slug}`}
                      className="transition-colors hover:text-primary"
                    >
                      {spotlightProduct.name}
                    </Link>
                  </h2>

                  {spotlightProduct.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {spotlightProduct.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {formatRupiah(spotlightProduct.price)}
                    </p>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        spotlightProduct.stock > 0 ? "text-success" : "text-error"
                      }`}
                    >
                      {spotlightProduct.stock > 0
                        ? `Stok ${spotlightProduct.stock}`
                        : "Stok habis"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <StoreQuickAddButton
                      product={{
                        id: spotlightProduct.id,
                        name: spotlightProduct.name,
                        price: spotlightProduct.price,
                        image: spotlightProduct.image,
                        stock: spotlightProduct.stock,
                        floristId: store.id,
                      }}
                      fullWidth
                    />
                    <Link
                      href={`/products/${spotlightProduct.slug}`}
                      className="btn-tertiary h-12 px-5 text-sm"
                    >
                      Lihat detail
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* Catalog Grid & URL Filter Bar */}
      <section className="container-custom mt-10 sm:mt-14">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Koleksi Bunga
            </h2>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {visibleProducts.length} dari {store.products.length} produk
          </span>
        </div>

        {store.products.length > 0 && (
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {metrics.categories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildStoreHref("", activeSort)}
                  scroll={false}
                  aria-current={!activeCategory ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                    !activeCategory
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground hover:border-outline"
                  }`}
                >
                  Semua ({store.products.length})
                </Link>
                {metrics.categories.map((cat) => {
                  const selected = activeCategory === cat.name;
                  return (
                    <Link
                      key={cat.name}
                      href={buildStoreHref(cat.name, activeSort)}
                      scroll={false}
                      aria-current={selected ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-foreground hover:border-outline"
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {STORE_SORTS.map((sortOption) => {
                const isSelected = activeSort === sortOption.value;
                return (
                  <Link
                    key={sortOption.value}
                    href={buildStoreHref(activeCategory, sortOption.value)}
                    scroll={false}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border border-primary bg-primary/10 text-primary"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sortOption.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {store.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 px-6 py-16 text-center">
            <Flower2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
            <h3 className="text-base font-bold text-foreground">
              Belum ada produk
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Koleksi dari {shopName} akan tampil di sini.
            </p>
            <Link href="/products" className="btn-secondary mt-6 inline-flex h-11 px-6 text-sm">
              Lihat Katalog
            </Link>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
            <p className="text-base font-semibold text-foreground">
              Belum ada produk di kategori &ldquo;{activeCategory}&rdquo;
            </p>
            <Link
              href={buildStoreHref("", activeSort)}
              scroll={false}
              className="btn-secondary mt-5 inline-flex h-11 px-6 text-sm"
            >
              Lihat semua
            </Link>
          </div>
        ) : (
          <div className="@container">
            <div className="grid grid-cols-1 gap-6 @sm:grid-cols-2 @lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <article
                  key={product.id}
                  className="m-card group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-container-low"
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="m-zoom object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Gambar tidak tersedia
                        </div>
                      )}

                      {product.metric?.categoryName && (
                        <div className="absolute left-3 top-3">
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-xs">
                            {product.metric.categoryName}
                          </span>
                        </div>
                      )}

                      <div className="absolute right-3 top-3">
                        {product.stock > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/95 px-2.5 py-1 text-xs font-semibold tabular-nums text-success">
                            Stok {product.stock}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/95 px-2.5 py-1 text-xs font-semibold text-error">
                            Stok habis
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="p-5">
                      <h3 className="line-clamp-2 text-lg font-bold text-foreground">
                        <Link
                          href={`/products/${product.slug}`}
                          className="transition-colors group-hover:text-primary hover:text-primary"
                        >
                          {product.name}
                        </Link>
                      </h3>

                      {product.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {product.description}
                        </p>
                      )}

                      {((product.metric?.soldCount ?? 0) > 0 ||
                        product.metric?.averageRating !== null) && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs tabular-nums">
                          {(product.metric?.soldCount ?? 0) > 0 && (
                            <span className="font-semibold text-primary">
                              {product.metric?.soldCount} terjual
                            </span>
                          )}
                          {product.metric?.averageRating !== null &&
                            product.metric?.averageRating !== undefined && (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Star
                                  className="h-3.5 w-3.5 fill-warning text-warning"
                                  aria-hidden="true"
                                />
                                {product.metric.averageRating.toFixed(1)}
                                {(product.metric.reviewCount ?? 0) > 0 && (
                                  <span className="text-muted-foreground">
                                    ({product.metric.reviewCount})
                                  </span>
                                )}
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold tabular-nums text-foreground">
                        {formatRupiah(product.price)}
                      </p>
                      <Link
                        href={`/products/${product.slug}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Detail <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>

                    <StoreQuickAddButton
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        stock: product.stock,
                        floristId: store.id,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

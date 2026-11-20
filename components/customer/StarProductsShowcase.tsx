"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { useCartStore } from "@/lib/stores/cartStore";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import { formatRupiah } from "@/lib/utils/formatters";
import type { StarProductsMode } from "@/lib/api/products";
import type { Product } from "@/types";

interface StarProductsShowcaseProps {
  products: Product[];
  mode: StarProductsMode;
}

/**
 * Etalase produk bintang di Beranda: menampilkan bunga dengan pembelian terbanyak lintas seluruh florist.
 * Item #1 tampil sebagai sorotan editorial besar, diikuti 2-4 produk unggulan terlaris berikutnya.
 */
export default function StarProductsShowcase({
  products,
  mode,
}: StarProductsShowcaseProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const floristName =
      product.florist?.floristProfile?.shopName ||
      product.florist?.name ||
      "Toko Florist";
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      floristId: product.floristId,
      floristName,
      slug: product.slug,
    });
    setAddedId(product.id);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setAddedId((current) => (current === product.id ? null : current));
    }, 1500);
  };

  if (products.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 sm:p-12">
        <div className="max-w-md text-center">
          <p className="text-base font-semibold text-foreground">
            Belum ada produk aktif
          </p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">
            Lihat Katalog
          </Link>
        </div>
      </div>
    );
  }

  const [lead, ...rest] = products;
  const leadShopName =
    lead.florist?.floristProfile?.shopName || lead.florist?.name || "Toko Florist";
  const leadCity = lead.florist?.floristProfile?.defaultAddress?.city;
  const leadOutOfStock = lead.stock === 0;
  const leadLowStock =
    lead.stock > 0 && lead.stock < PRODUCT_LOW_STOCK_THRESHOLD;
  const leadJustAdded = addedId === lead.id;

  const restGridCols =
    rest.length === 1
      ? "grid-cols-1"
      : rest.length === 2
        ? "grid-cols-1 @sm:grid-cols-2"
        : rest.length === 3
          ? "grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3"
          : "grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-4";

  return (
    <div>
      {/* Peringkat #1 Star Product — Sorotan Utama */}
      <article className="m-card group grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-12">
        <Link
          href={`/products/${lead.slug}`}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-container lg:col-span-7 lg:aspect-auto lg:min-h-[420px]"
        >
          {lead.image ? (
            <Image
              src={lead.image}
              alt={lead.name}
              fill
              className="m-zoom object-cover"
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">
              Gambar tidak tersedia
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-surface-dark/90 px-3.5 py-1.5 text-xs font-semibold text-kicker backdrop-blur-xs">
              {mode === "best-selling" && (lead.soldCount ?? 0) > 0
                ? "#1 Terlaris"
                : "Pilihan Florist"}
            </span>
          </div>

          {(leadOutOfStock || leadLowStock) && (
            <div className="absolute right-4 top-4">
              <span className="inline-flex items-center rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
                {leadOutOfStock ? "Stok habis" : `Sisa ${lead.stock}`}
              </span>
            </div>
          )}
        </Link>

        <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {lead.category?.name && (
                <span className="rounded-full border border-border bg-surface-container-low px-3 py-1 font-medium text-foreground">
                  {lead.category.name}
                </span>
              )}
              <Link
                href={`/stores/${lead.floristId}`}
                className="inline-flex min-h-8 items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <span>{leadShopName}</span>
                {leadCity && (
                  <span className="text-muted-foreground/70">• {leadCity}</span>
                )}
              </Link>
            </div>

            <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <Link
                href={`/products/${lead.slug}`}
                className="transition-colors hover:text-primary"
              >
                {lead.name}
              </Link>
            </h3>

            {((lead.soldCount ?? 0) > 0 || (lead.averageRating ?? 0) > 0) && (
              <div className="mt-3.5 flex flex-wrap items-center gap-4 text-sm tabular-nums">
                {(lead.soldCount ?? 0) > 0 && (
                  <span className="font-semibold text-primary">
                    {lead.soldCount} terjual
                  </span>
                )}
                {lead.averageRating && lead.averageRating > 0 && (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                    {lead.averageRating.toFixed(1)}
                    {lead.reviewCount && (
                      <span className="text-muted-foreground">
                        ({lead.reviewCount})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {lead.description && (
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {lead.description}
              </p>
            )}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {formatRupiah(lead.price)}
              </p>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  leadOutOfStock ? "text-error" : "text-success"
                }`}
              >
                {leadOutOfStock ? "Stok habis" : `Stok ${lead.stock}`}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleAddToCart(lead)}
                disabled={leadOutOfStock}
                className="btn-primary flex-1 min-w-[180px]"
              >
                {leadOutOfStock ? (
                  "Stok habis"
                ) : leadJustAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Ditambahkan
                  </>
                ) : (
                  "Tambah ke keranjang"
                )}
              </button>
              <Link
                href={`/products/${lead.slug}`}
                className="btn-tertiary h-14 px-6"
              >
                Lihat detail
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Peringkat #2 hingga #5 */}
      {rest.length > 0 && (
        <div className="@container mt-6">
          <div className={`grid gap-6 ${restGridCols}`}>
            {rest.map((product, index) => {
              const rankNumber = String(index + 2).padStart(2, "0");
              const shopName =
                product.florist?.floristProfile?.shopName ||
                product.florist?.name ||
                "Toko Florist";
              const city =
                product.florist?.floristProfile?.defaultAddress?.city;
              const isOutOfStock = product.stock === 0;
              const isLowStock =
                product.stock > 0 && product.stock < PRODUCT_LOW_STOCK_THRESHOLD;
              const justAdded = addedId === product.id;

              return (
                <article
                  key={product.id}
                  className="m-card group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative aspect-[4/5] w-full overflow-hidden bg-surface-container"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="m-zoom object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Tidak Ada Gambar
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-surface-dark/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-kicker">
                        #{rankNumber}
                      </span>
                    </div>

                    {(isOutOfStock || isLowStock) && (
                      <div className="absolute right-3 top-3">
                        <span className="inline-flex items-center rounded-full border border-border bg-surface/95 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                          {isOutOfStock ? "Stok habis" : `Sisa ${product.stock}`}
                        </span>
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <Link
                      href={`/stores/${product.floristId}`}
                      className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      <span className="truncate">{shopName}</span>
                      {city && (
                        <span className="text-muted-foreground/70">• {city}</span>
                      )}
                    </Link>

                    <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-foreground sm:text-lg">
                      <Link
                        href={`/products/${product.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {product.name}
                      </Link>
                    </h3>

                    {((product.soldCount ?? 0) > 0 ||
                      (product.averageRating ?? 0) > 0) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs tabular-nums">
                        {(product.soldCount ?? 0) > 0 && (
                          <span className="font-semibold text-primary">
                            {product.soldCount} terjual
                          </span>
                        )}
                        {product.averageRating && product.averageRating > 0 && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Star
                              className="h-3.5 w-3.5 fill-warning text-warning"
                              aria-hidden="true"
                            />
                            {product.averageRating.toFixed(1)}
                            {product.reviewCount && (
                              <span className="text-muted-foreground">
                                ({product.reviewCount})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/80 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {formatRupiah(product.price)}
                      </p>
                      <Link
                        href={`/products/${product.slug}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Detail <span aria-hidden="true">→</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      aria-label={
                        isOutOfStock
                          ? `${product.name} stok habis`
                          : `Tambah ${product.name} ke keranjang`
                      }
                      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {justAdded ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Masuk
                        </>
                      ) : isOutOfStock ? (
                        "Habis"
                      ) : (
                        "Tambah"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

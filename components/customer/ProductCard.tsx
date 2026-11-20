"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { useCartStore } from "@/lib/stores/cartStore";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import { formatRupiah } from "@/lib/utils/formatters";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  featured?: boolean;
  rankLabel?: string;
}

// Card display produk editorial dengan provenance toko, metrik penjualan, dan quick add ke keranjang
export default function ProductCard({
  product,
  featured = false,
  rankLabel,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isOutOfStock = product.stock === 0;
  const isLowStock =
    product.stock > 0 && product.stock < PRODUCT_LOW_STOCK_THRESHOLD;
  const shopName =
    product.florist?.floristProfile?.shopName ||
    product.florist?.name ||
    "Toko Florist";
  const city = product.florist?.floristProfile?.defaultAddress?.city;
  const soldCount = product.soldCount ?? 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      floristId: product.floristId,
      floristName: shopName,
      slug: product.slug,
    });
    setJustAdded(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setJustAdded(false);
    }, 1500);
  };

  if (featured) {
    return (
      <article className="m-card group grid overflow-hidden rounded-2xl border border-border bg-card @md:grid-cols-12 @lg:col-span-2">
        <Link
          href={`/products/${product.slug}`}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-container @md:col-span-6 @md:aspect-auto @md:min-h-[340px]"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="m-zoom object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full min-h-[240px] w-full items-center justify-center text-sm text-muted-foreground">
              Tidak Ada Gambar
            </div>
          )}

          {(product.category?.name || rankLabel) && (
            <div className="absolute left-3.5 top-3.5">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-xs">
                {rankLabel ?? product.category?.name}
              </span>
            </div>
          )}

          {(isOutOfStock || isLowStock) && (
            <div className="absolute right-3.5 top-3.5">
              <span className="inline-flex items-center rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
                {isOutOfStock ? "Stok habis" : `Sisa ${product.stock}`}
              </span>
            </div>
          )}
        </Link>

        <div className="flex flex-col justify-between p-6 sm:p-7 @md:col-span-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.category?.name && (
                <span className="rounded-full border border-border bg-surface-container-low px-2.5 py-1 font-medium text-foreground">
                  {product.category.name}
                </span>
              )}
              <Link
                href={`/stores/${product.floristId}`}
                className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <span>{shopName}</span>
                {city && <span className="text-muted-foreground/70">• {city}</span>}
              </Link>
            </div>

            <h3 className="mt-3.5 text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
              <Link
                href={`/products/${product.slug}`}
                className="transition-colors hover:text-primary"
              >
                {product.name}
              </Link>
            </h3>

            {(soldCount > 0 || (product.averageRating ?? 0) > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs tabular-nums sm:text-sm">
                {soldCount > 0 && (
                  <span className="font-semibold text-primary">
                    {soldCount} terjual
                  </span>
                )}
                {product.averageRating && product.averageRating > 0 && (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Star
                      className="h-4 w-4 fill-warning text-warning"
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

            {product.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-border/80 pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatRupiah(product.price)}
              </p>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isOutOfStock ? "text-error" : "text-success"
                }`}
              >
                {isOutOfStock ? "Stok habis" : `Stok ${product.stock}`}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="btn-primary h-12 flex-1 min-w-[160px] px-5 text-sm"
              >
                {isOutOfStock ? (
                  "Stok habis"
                ) : justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Ditambahkan
                  </>
                ) : (
                  "Tambah ke keranjang"
                )}
              </button>
              <Link
                href={`/products/${product.slug}`}
                className="btn-tertiary h-12 px-5 text-sm"
              >
                Lihat detail
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="m-card group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Tidak Ada Gambar
          </div>
        )}

        {(product.category?.name || rankLabel) && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-xs">
              {rankLabel ?? product.category?.name}
            </span>
          </div>
        )}

        {(isOutOfStock || isLowStock) && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
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
          {city && <span className="text-muted-foreground/70">• {city}</span>}
        </Link>

        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-foreground">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        )}

        {(soldCount > 0 || (product.averageRating ?? 0) > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs tabular-nums">
            {soldCount > 0 && (
              <span className="font-semibold text-primary">
                {soldCount} terjual
              </span>
            )}
            {product.averageRating && product.averageRating > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Star
                  className="h-3.5 w-3.5 fill-warning text-warning"
                  aria-hidden="true"
                />
                <span>{product.averageRating.toFixed(1)}</span>
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

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/80 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tabular-nums text-foreground">
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
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          aria-label={
            isOutOfStock
              ? `${product.name} stok habis`
              : `Tambah ${product.name} ke keranjang`
          }
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
}

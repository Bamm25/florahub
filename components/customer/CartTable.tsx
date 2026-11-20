"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import { useCartStore } from "@/lib/stores/cartStore";
import { formatRupiah } from "@/lib/utils/formatters";
import type { CartItem } from "@/types";

interface FloristCartGroup {
  floristId: string;
  floristName: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

interface BackfillProductsResponse {
  success?: boolean;
  data?: {
    products?: Array<{
      id: string;
      slug?: string;
      florist?: {
        name?: string;
        floristProfile?: {
          shopName?: string;
        } | null;
      } | null;
    }>;
  };
}

// Daftar item keranjang belanja yang dikelompokkan per toko florist dengan resolusi 1-klik saat multi-toko
export default function CartTable() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeItemsByFlorist = useCartStore(
    (state) => state.removeItemsByFlorist,
  );
  const keepOnlyFlorist = useCartStore((state) => state.keepOnlyFlorist);
  const hydrateItemMetadata = useCartStore(
    (state) => state.hydrateItemMetadata,
  );

  // Backfill otomatis nama toko & slug untuk item lama di localStorage yang belum menyimpan floristName
  useEffect(() => {
    const missingIds = items
      .filter((item) => !item.floristName || !item.slug)
      .map((item) => item.productId);

    if (missingIds.length === 0) return;

    const controller = new AbortController();

    async function backfillMetadata() {
      try {
        const res = await fetch(
          `/api/products?ids=${encodeURIComponent(missingIds.join(","))}&limit=100`,
          { signal: controller.signal },
        );
        if (!res.ok || controller.signal.aborted) return;
        const payload = (await res.json()) as BackfillProductsResponse;
        const products = payload.data?.products ?? [];
        if (products.length === 0 || controller.signal.aborted) return;

        const metaById: Record<string, { floristName?: string; slug?: string }> =
          {};
        for (const prod of products) {
          const resolvedName =
            prod.florist?.floristProfile?.shopName || prod.florist?.name;
          if (resolvedName || prod.slug) {
            metaById[prod.id] = {
              floristName: resolvedName,
              slug: prod.slug,
            };
          }
        }

        if (Object.keys(metaById).length > 0 && !controller.signal.aborted) {
          hydrateItemMetadata(metaById);
        }
      } catch {
        // Abaikan jika gagal mengambil metadata tambahan
      }
    }

    void backfillMetadata();
    return () => controller.abort();
  }, [items, hydrateItemMetadata]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center sm:p-12">
        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Keranjang masih kosong
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Pilih bunga dari katalog untuk mulai belanja.
        </p>
        <Link href="/products" className="btn-primary mt-6">
          Lihat Katalog
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const groupMap = new Map<string, CartItem[]>();
  for (const item of items) {
    const existing = groupMap.get(item.floristId);
    if (existing) {
      existing.push(item);
    } else {
      groupMap.set(item.floristId, [item]);
    }
  }

  const floristGroups: FloristCartGroup[] = Array.from(groupMap.entries()).map(
    ([floristId, groupItems], idx) => {
      const namedItem = groupItems.find((i) => i.floristName?.trim());
      return {
        floristId,
        floristName: namedItem?.floristName?.trim() || `Toko Florist #${idx + 1}`,
        items: groupItems,
        itemCount: groupItems.reduce((sum, i) => sum + i.quantity, 0),
        subtotal: groupItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    },
  );

  const hasMultipleFlorists = floristGroups.length > 1;

  return (
    <div className="space-y-6">
      {floristGroups.map((group, idx) => (
        <section
          key={group.floristId}
          aria-label={`Produk dari ${group.floristName}`}
          className={`overflow-hidden rounded-2xl border bg-card ${
            hasMultipleFlorists ? "border-foreground/25" : "border-border"
          }`}
        >
          {/* Header Toko Florist */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-container-low/70 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2.5">
              {hasMultipleFlorists && (
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  Toko {idx + 1}/{floristGroups.length}
                </span>
              )}
              <Link
                href={`/stores/${group.floristId}`}
                className="text-sm font-bold text-foreground transition-colors hover:text-primary sm:text-base"
              >
                {group.floristName}
              </Link>
              <span className="text-xs tabular-nums text-muted-foreground">
                · {group.itemCount} produk · {formatRupiah(group.subtotal)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasMultipleFlorists ? (
                <>
                  <button
                    type="button"
                    onClick={() => removeItemsByFlorist(group.floristId)}
                    className="inline-flex min-h-9 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error"
                  >
                    Hapus Toko
                    <span className="sr-only"> {group.floristName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => keepOnlyFlorist(group.floristId)}
                    className="btn-primary h-9 px-3.5 py-0 text-xs font-semibold"
                  >
                    Pilih Toko Ini
                    <span className="sr-only"> ({group.floristName})</span>
                  </button>
                </>
              ) : (
                <Link
                  href={`/stores/${group.floristId}`}
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Kunjungi Toko →
                </Link>
              )}
            </div>
          </header>

          {/* Daftar Produk dalam Toko Ini */}
          <div className="divide-y divide-border">
            {group.items.map((item) => {
              const isOutOfStock = item.stock <= 0;
              const isLowStock =
                item.stock > 0 && item.stock < PRODUCT_LOW_STOCK_THRESHOLD;

              return (
                <article
                  key={item.productId}
                  className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  {/* Media + Info Produk */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container sm:w-24">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Tanpa foto
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {(isOutOfStock || isLowStock) && (
                        <div className="mb-1.5">
                          <span className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-2.5 py-0.5 text-xs font-semibold tabular-nums text-warning">
                            {isOutOfStock ? "Stok habis" : `Sisa ${item.stock}`}
                          </span>
                        </div>
                      )}

                      <h2 className="text-base font-bold leading-snug text-foreground sm:text-lg">
                        {item.slug ? (
                          <Link
                            href={`/products/${item.slug}`}
                            className="transition-colors hover:text-primary"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm tabular-nums text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatRupiah(item.price)}
                        </span>
                        <span>·</span>
                        <span>Stok {item.stock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kontrol Kuantitas, Subtotal Baris, & Hapus */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-4 sm:justify-end sm:border-t-0 sm:pt-0">
                    <div className="flex items-center rounded-xl border border-border bg-surface p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        disabled={item.quantity <= 1}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Kurangi jumlah ${item.name}`}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        aria-label={`Jumlah untuk ${item.name}`}
                        onChange={(e) => {
                          const newQty = Number.parseInt(e.target.value, 10);
                          if (!Number.isNaN(newQty)) {
                            updateQuantity(
                              item.productId,
                              Math.min(Math.max(1, newQty), item.stock),
                            );
                          }
                        }}
                        className="h-11 w-14 border-x border-border/60 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.min(item.quantity + 1, item.stock),
                          )
                        }
                        disabled={item.quantity >= item.stock}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Tambah jumlah ${item.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground sm:hidden">
                          Subtotal
                        </p>
                        <p className="text-base font-bold tabular-nums text-foreground sm:min-w-[115px] sm:text-lg">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-error/20 hover:bg-error/10 hover:text-error"
                        aria-label={`Hapus ${item.name} dari keranjang`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
